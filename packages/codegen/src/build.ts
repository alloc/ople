import {
  BinaryExpression,
  BooleanLiteral,
  Expression,
  FunctionDeclaration,
  Identifier,
  Node,
  Project,
  SourceFile,
  Statement,
  StringLiteral,
  SyntaxKind,
  ts,
} from 'ts-morph'
import { query as q, FaunaJSON, Expr, ExprVal } from 'faunadb'
import path from 'path'

export function build() {
  const cwd = process.cwd()
  const project = new Project({
    tsConfigFilePath: path.join(cwd, 'tsconfig.json'),
  })
  const queryDir = project.addDirectoryAtPath(path.join(cwd, 'src/queries'), {
    recursive: true,
  })
  queryDir.getDescendantSourceFiles().forEach(compileQueries)
}

interface QueryDescriptor {
  name: string
  query: string
}

export function compileQueries(file: SourceFile) {
  const locals: { [name: string]: QueryDescriptor } = {}
  const exports: { [name: string]: QueryDescriptor } = {}
  for (const stmt of file.getStatements()) {
    if (Node.isFunctionDeclaration(stmt)) {
      const name = stmt.getName()
      if (!name) continue
      try {
        var lambda = compileLambda(stmt)
      } finally {
        resetContext()
      }
      const query = {
        name,
        query: Expr.toString(lambda, { compact: true }),
      }
      if (stmt.getExportKeyword()) {
        exports[name] = query
      } else {
        locals[name] = query
      }
    } else {
      throw Error('Unsupported top-level statement: ' + stmt.constructor.name)
    }
  }
  return exports
}

function compileLambda(fun: FunctionDeclaration) {
  // TODO: throw if param type is not json-compatible
  const params = fun.getParameters().map(p => p.getName())
  return q.Lambda(params, compileScopedBlock(fun.getStatements(), params))
}

function compileScopedBlock(stmts: Statement[], scope: string[]) {
  pushLocals(scope)
  const block = compileBlock(stmts)
  popLocals()
  return block
}

function compileLambdaWithBlock(stmts: Statement[]) {
  return q.Lambda([], compileBlock(stmts))
}

function compileBlock(stmts: Statement[], needsReturn = true): ExprVal | null {
  const block: ExprVal[] = []
  for (let i = 0; i < stmts.length; i++) {
    let stmt = stmts[i]
    // console.log(stmt.constructor.name)
    if (Node.isReturnStatement(stmt)) {
      const expr = stmt.getExpression()
      block.push(expr ? compileExpression(expr) : null)
      needsReturn = false
      break
    }
    if (Node.isVariableStatement(stmt)) {
      const vars: any = {}
      while (true) {
        for (const decl of stmt.getDeclarations()) {
          const init = decl.getInitializer()
          if (!init) {
            throw Error('Cannot declare a variable without a value')
          }
          const name = decl.getName()
          vars[name] = compileExpression(init)

          // Push to the current scope, so later variables can refer
          // to this variable in their initializer.
          locals.push(name)
        }
        stmt = stmts[i + 1]
        if (Node.isVariableStatement(stmt)) i++
        else break
      }
      block.push(q.Let(vars, compileBlock(stmts.slice(i + 1)) as any))
      needsReturn = false
      break
    }
    if (Node.isExpressionStatement(stmt)) {
      block.push(compileExpression(stmt.getExpression()))
    }
    // if..else
    else if (Node.isIfStatement(stmt)) {
      const thenStmt = stmt.getThenStatement()
      const elseStmt = stmt.getElseStatement()

      let thenBlock = Node.isStatementedNode(thenStmt)
        ? thenStmt.getStatements()
        : null

      let elseBlock = Node.isStatementedNode(elseStmt)
        ? elseStmt.getStatements()
        : null

      const thenReturns = !!thenBlock?.find(Node.isReturnStatement)
      const elseReturns = !!elseBlock?.find(Node.isReturnStatement)

      const shouldAbsorb = thenReturns || elseReturns
      if (shouldAbsorb) {
        const absorbed = stmts.slice(i + 1)
        if (!elseReturns) {
          elseBlock = elseBlock ? elseBlock.concat(absorbed) : absorbed
        } else if (!thenReturns) {
          thenBlock = thenBlock ? thenBlock.concat(absorbed) : absorbed
        }
      }
      block.push(
        q.If(
          compileCondition(stmt.getExpression()),
          thenBlock && compileScopedBlock(thenBlock, []),
          elseBlock && compileScopedBlock(elseBlock, [])
        )
      )
      if (shouldAbsorb) {
        needsReturn = false
        break
      }
    }
  }
  if (needsReturn) {
    block.push(null)
  }
  // console.log(stmts.map(stmt => stmt.constructor.name))
  return block.length > 1 ? q.Do(...block) : block[0] || null
}

function compileCondition(expr: Expression): ExprVal<boolean> {
  const type = checkType(expr)
  const query = compileExpression(expr)
  // TODO: implement CastToBool function
  return type.isBoolean() ? query : q.Call('CastToBool', query)
}

function compileIdentifier(node: Identifier) {
  const name = node.getText()
  if (!locals.includes(name)) {
    throw Error('Unknown identifier: ' + JSON.stringify(name))
  }
  return q.Var(name)
}

function compileExpression(expr: Expression): any {
  // console.log(expr.constructor.name)
  if (Node.isIdentifier(expr)) {
    return compileIdentifier(expr)
  }
  if (Node.isPropertyAccessExpression(expr)) {
    if (expr.getQuestionDotTokenNode()) {
      throw SyntaxError('Optional chaining is forbidden')
    }
    const key = expr.getName()
    const left = expr.getExpression()
    const leftType = checkType(left)
    propertyChain.push(key)
    const leftExpr = compileExpression(left)
    propertyChain.pop()
    // console.log(key, leftType.getText())
    if (leftType.isArray()) {
      if (key == 'length') {
        return q.Count(leftExpr)
      }
    } else if (leftType.isString()) {
      if (key == 'length') {
        return q.Length(leftExpr)
      }
    }
    if (Node.isPropertyAccessExpression(left)) {
      return leftExpr
    }
    return q.Select(
      propertyChain.length ? propertyChain.concat(key).reverse() : key,
      leftExpr
    )
  }
  if (Node.isPrefixUnaryExpression(expr)) {
    // TODO: convert !! to CastToBool call
    const op = getOperatorFromToken(expr.getOperatorToken())
    const opFn = op && getOperatorFn(op)
    if (!opFn) {
      expr.getSourceFile()
      throw Error(
        'Unsupported operator: ' +
          expr
            .getText()
            .slice(0, expr.getOperand().getStart() - expr.getStart())
      )
    }
    const compileOperand = opFn == q.Not ? compileCondition : compileExpression
    return opFn(compileOperand(expr.getOperand()))
  }
  if (Node.isPostfixUnaryExpression(expr)) {
    throw Error(
      'Unsupported operator: ' +
        expr.getText().slice(expr.getOperand().getEnd())
    )
  }
  if (Node.isBinaryExpression(expr)) {
    const op = expr.getOperatorToken().getText()
    const opFn = getOperatorFn(op)
    if (!opFn) {
      throw Error('Unsupported operator: ' + op)
    }
    return opFn(
      compileExpression(expr.getLeft()),
      compileExpression(expr.getRight())
    )
  }
  if (Node.isRegularExpressionLiteral(expr)) {
    return expr.getLiteralText()
  }
  if (isLiteralNode(expr)) {
    return eval(expr.print())
  }
  return null
}

//
// Utility
//

function checkType(node: Node) {
  return node.getProject().getTypeChecker().getTypeAtLocation(node)
}

function isLiteralNode(node: Node): node is BooleanLiteral | StringLiteral {
  return 'getLiteralValue' in node
}

function getOperatorFromToken(op: number) {
  return op == SyntaxKind.ExclamationToken
    ? '!'
    : op == SyntaxKind.TildeToken
    ? '~'
    : null
}

function getOperatorFn(op: string) {
  return op == '>'
    ? q.GT
    : op == '<'
    ? q.LT
    : op == '>='
    ? q.GTE
    : op == '<='
    ? q.LTE
    : op == '=='
    ? q.Equals
    : op == '!'
    ? q.Not
    : op == '+'
    ? q.Add
    : op == '-'
    ? q.Subtract
    : op == '*'
    ? q.Multiply
    : op == '/'
    ? q.Divide
    : op == '%'
    ? q.Modulo
    : op == '&'
    ? q.BitAnd
    : op == '|'
    ? q.BitOr
    : op == '^'
    ? q.BitXor
    : op == '~'
    ? q.BitNot
    : null
}

//
// Global context
//

/** Local variable names */
let locals: string[] = []
/** Stack of local scopes */
let scopes: string[][] = []
/** Property access chain */
let propertyChain: string[] = []

function resetContext() {
  locals = []
  scopes = []
  propertyChain = []
}

function pushLocals(names: string[]) {
  scopes.push(locals)
  locals = locals.concat(names)
}

function popLocals() {
  locals = scopes.pop() || []
}
