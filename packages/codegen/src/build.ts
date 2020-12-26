import {
  BooleanLiteral,
  Expression,
  FunctionDeclaration,
  Node,
  Project,
  SourceFile,
  Statement,
  StringLiteral,
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
      const query = {
        name,
        query: FaunaJSON.stringify(compileLambda(stmt)),
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
  return q.Lambda(
    fun.getParameters().map(p => p.getName()),
    compileBlock(fun.getStatements())
  )
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
      const thenBlock = Node.isStatementedNode(thenStmt)
        ? thenStmt.getStatements()
        : null

      const elseStmt = stmt.getElseStatement()
      let elseBlock = Node.isStatementedNode(elseStmt)
        ? elseStmt.getStatements()
        : null

      const shouldAbsorb =
        thenBlock?.find(Node.isReturnStatement) ||
        elseBlock?.find(Node.isReturnStatement)

      if (shouldAbsorb) {
        const absorbed = stmts.slice(i + 1)
        elseBlock = elseBlock ? elseBlock.concat(absorbed) : absorbed
      }
      block.push(
        q.If(
          compileExpression(stmt.getExpression()) as Expr<boolean>,
          thenBlock && compileBlock(thenBlock),
          elseBlock && compileBlock(elseBlock)
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

function compileExpression(expr: Expression) {
  // console.log(expr.constructor.name)
  if (Node.isRegularExpressionLiteral(expr)) {
    return expr.getLiteralText()
  }
  if (isLiteralNode(expr)) {
    return eval(expr.print())
  }
  return null
}

function isLiteralNode(node: Node): node is BooleanLiteral | StringLiteral {
  return 'getLiteralValue' in node
}
