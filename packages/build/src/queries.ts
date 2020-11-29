import {
  Project,
  Node,
  ts,
  TypeFormatFlags,
  CallExpression,
  SourceFile,
  Type,
  NamedNode,
} from 'ts-morph'
import { join, resolve, relative, isAbsolute } from 'path'
import dedent from 'dedent'
import {
  getArgTypes,
  ExportedType,
  ImporterTypeMap,
  getImportLines,
} from './common'

type ParsedQuery = {
  name: string
  args: string[]
  returnType: string
  docs?: string
  body?: Node
}

export interface QueryScannerProps {
  /** The project root */
  cwd?: string
  /** The parent directory of the generated modules */
  outDir?: string
}

// TODO: refactor `build` method into `buildQueries` function that takes a `QueryScanner` object
export class QueryScanner {
  pkg: any
  props: Required<QueryScannerProps>
  project: Project

  /** All methods passed to an `api.extend` call */
  queries: { [name: string]: ParsedQuery } = {}

  /** The locally declared types */
  declaredTypes = new Set<Node>()

  /** The importer type map of every imported file */
  importedTypes = new Map<SourceFile, ImporterTypeMap>()

  /** The exported types of the main file */
  exportedTypes = new Set<ExportedType>()

  /** Paths that should be watched */
  watchPaths = new Set<string>()

  /** Nodes which have been visited */
  visited = new Set<Node>()

  constructor({
    cwd = process.cwd(),
    outDir = 'src/queries',
  }: QueryScannerProps = {}) {
    cwd = resolve(cwd)
    if (isAbsolute(outDir)) {
      outDir = relative(cwd, outDir)
    }
    this.pkg = require(resolve(cwd, 'package.json'))
    this.props = { cwd, outDir }
    this.project = new Project({
      tsConfigFilePath: join(cwd, 'tsconfig.json'),
    })
  }

  collectExportedTypes(mainModule: SourceFile) {
    const { watchPaths, exportedTypes } = this
    for (const stmt of mainModule.getStatements()) {
      if (Node.isExportDeclaration(stmt)) {
        exportedTypes.add(stmt)

        const importedFile = stmt.getModuleSpecifierSourceFile()
        if (importedFile) {
          watchPaths.add(importedFile.getFilePath())
        } else {
          stmt
            .getDescendantsOfKind(ts.SyntaxKind.ExportSpecifier)
            .forEach(spec => this.collectTypes(spec.getNameNode()))
        }
      } else if (Node.isTypeAliasDeclaration(stmt)) {
        if (stmt.getExportKeyword()) {
          exportedTypes.add(stmt)
          this.collectTypes(stmt.getTypeNode())
        }
      } else if (Node.isInterfaceDeclaration(stmt)) {
        if (stmt.getExportKeyword()) {
          exportedTypes.add(stmt)
          stmt.getMembers().forEach(prop => {
            this.collectTypes(
              Node.isPropertySignature(prop) ? prop.getTypeNode() : prop
            )
          })
        }
      }
    }
  }

  /** Build the text of our `file` object by scanning the project. */
  build() {
    const { project, props } = this

    const getFile = (file: string) =>
      project.addSourceFileAtPathIfExists(file) ||
      project.createSourceFile(file)

    const outDir = join(props.cwd, props.outDir)
    const queriesPath = join(outDir, 'queries.d.ts')
    const queriesFile = getFile(queriesPath)
    const distPath = join(outDir, 'index.ts')
    const distFile = getFile(distPath)

    // Reset our state.
    this.queries = {}
    this.visited.clear()
    this.importedTypes.clear()
    this.declaredTypes.clear()
    this.exportedTypes.clear()
    this.watchPaths.clear()

    // Watch the tsconfig for changes.
    this.watchPaths.add(join(props.cwd, 'tsconfig.json'))

    // Find every query definition.
    this.collectQueries()

    const queryLines: string[] = []
    const importLines = getImportLines(
      this.importedTypes,
      queriesFile,
      this.watchPaths
    )
    importLines.unshift(`import { NativeQueries } from '@ople/server'`)

    for (const { name, args, returnType, docs } of Object.values(
      this.queries
    )) {
      if (docs) {
        for (const line of docs.split('\n')) {
          queryLines.push(line)
        }
      }
      queryLines.push(`${name}(${args.join(', ')}): ${returnType}`)
    }

    const disclaimer = dedent`
      //
      // THIS IS A GENERATED FILE. DO NOT TOUCH!
      //
    `

    queriesFile.removeText()
    queriesFile.addStatements([
      disclaimer,
      importLines.join('\n'),
      text => {
        text.newLine()
        text.writeLine(`declare interface CustomQueries {`)
        queryLines.forEach(line => text.writeLine('  ' + line))
        text.writeLine(`}`)
        text.newLine()
        this.declaredTypes.forEach(node => {
          text.writeLine(node.getText())
        })
      },
      dedent`
        declare const q: Queries & { [key: string]: Function | undefined }
        export default q

        export type Queries = NativeQueries & CustomQueries
        export {
          Bytes,
          Collection,
          Cursor,
          Database,
          Document,
          FaunaDate,
          FaunaTime,
          Function,
          Index,
          Lambda,
          Page,
          Permissions,
          Ref,
          Role,
          SetRef,
          Token,
        } from '@ople/server'
      `,
    ])

    distFile.removeText()
    distFile.addStatements(
      dedent`
        ${disclaimer}
        import {createQueries} from '@ople/server'
        import type {Queries} from './queries'

        export const q = createQueries<Queries>()

        // Prevent type portability issues.
        export {} from 'faunadb'
      `
    )

    return [queriesFile, distFile]
  }

  collectQueries() {
    const { queries, project, props } = this

    const skipped = ['index.ts', 'queries.d.ts']
    const files = project.getSourceFiles(join(props.cwd, props.outDir, '*.ts'))
    for (const file of files) {
      if (skipped.includes(file.getBaseName())) {
        continue
      }
      for (const stmt of file.getStatements()) {
        if (!Node.isExpressionStatement(stmt)) {
          continue
        }
        const expr = stmt.getExpression()
        if (!Node.isBinaryExpression(expr)) {
          continue
        }
        const left = expr.getLeft()
        if (!Node.isPropertyAccessExpression(left)) {
          continue
        }
        const id = left.getText()
        if (id.startsWith('q.')) {
          const name = id.slice(2)
          const docs = stmt.getJsDocs()[0]?.getText()

          const getText = (node: Type) =>
            node.getText(
              stmt,
              TypeFormatFlags.UseFullyQualifiedType |
                TypeFormatFlags.UseAliasDefinedOutsideCurrentScope
            )

          const right = expr.getRight()
          if (Node.isArrowFunction(right)) {
            queries[name] = {
              name,
              args: getArgTypes(right, stmt),
              returnType: getText(right.getReturnType()),
              docs,
            }
            // } else if (Node.isFunctionExpression(right)) {
            //   debugger
            // } else if (Node.isIdentifier(right)) {
            //   debugger
          } else {
            console.warn(`Invalid assignment to "${id}"`)
            continue
          }

          this.collectTypes(right)
        }
      }
    }
  }

  /** Collect types to be declared or imported. */
  collectTypes(root: Node | undefined, importer = root?.getSourceFile()) {
    if (!root) return

    const { project, visited, declaredTypes, importedTypes } = this
    visit(root)

    function visit(node: Node) {
      if (visited.has(node)) return
      visited.add(node)

      if (Node.isParameterDeclaration(node)) {
        node = node.getTypeNodeOrThrow()
      }

      if (Node.isIdentifier(node) || Node.isTypeReferenceNode(node)) {
        collect(node)
      } else {
        if (Node.isFunctionLikeDeclaration(node)) {
          node.getParameters().forEach(visit)
          collect(node.getReturnType())
        } else if (Node.isInterfaceDeclaration(node)) {
          for (const prop of node.getProperties()) {
            visit(prop.getTypeNodeOrThrow())
          }
        } else if (!Node.isBlock(node)) {
          node.forEachChild(visit)
        }
      }
    }

    function collect(node: Node | Type, alias?: string): void {
      if (node instanceof Type) {
        let sym = node.getAliasSymbol()
        let args = node.getAliasTypeArguments()
        if (!sym) {
          if ((sym = node.getSymbol())) {
            args = node.getTypeArguments()
          } else return
        }
        if (!alias) {
          alias = sym.getName()
        }
        sym.getDeclarations().forEach(node => collect(node, alias))
        return args.forEach(arg => collect(arg))
      }
      if (Node.isTypeReferenceNode(node)) {
        collect(node.getTypeName())
        return node.getTypeArguments().forEach(arg => collect(arg))
      }
      if (!alias) {
        alias = node.getText()
      }
      if (Node.isNamedNode(node)) {
        store(alias, node, node.getSourceFile())
        if (Node.isTypeArgumentedNode(node)) {
          node.getTypeArguments().forEach(arg => collect(arg))
        }
      } else {
        const libRE = /\/typescript\/lib\/[^\/]+\.d\.ts$/
        const lang = project.getLanguageService()
        const defs = lang.getDefinitions(node)
        for (const def of defs) {
          const file = def.getSourceFile()
          if (libRE.test(file.getFilePath())) {
            continue
          }
          const type = def.getNode().getParent()
          if (type && Node.isNamedNode(type)) {
            store(alias, type, file)
            break
          }
        }
      }
    }

    function store(alias: string, decl: Node & NamedNode, file: SourceFile) {
      if (file == importer) {
        if (!declaredTypes.has(decl)) {
          declaredTypes.add(decl)
          visit(decl)
        }
      } else if (importer) {
        let imports = importedTypes.get(file)
        if (!imports) {
          importedTypes.set(file, (imports = new Map()))
        }
        let types = imports.get(importer)
        if (!types) {
          imports.set(importer, (types = new Map()))
        }
        if (!types.has(alias)) {
          types.set(alias, decl)
        }
      }
    }
  }
}

/** Find every assignment to the `q` namespace. */
function findQueryDefinitions(project: Project, watchPaths: Set<string>) {
  const calls: CallExpression[] = []

  const lang = project.getLanguageService()
  for (const file of project.getSourceFiles()) {
    const imports = file.getImportDeclarations()

    // Find the "@ople/server" import
    const opleImport = imports.find(
      dep => dep.getModuleSpecifierValue() == '@ople/server'
    )

    if (!opleImport) {
      continue
    }

    // Find the "api" object
    const apiObject = opleImport
      .getNamedImports()
      .find(spec => spec.getName() == 'api')

    if (!apiObject) {
      continue
    }

    watchPaths.add(file.getFilePath())

    for (const sym of lang.findReferences(apiObject)) {
      for (const ref of sym.getReferences()) {
        const access = ref
          .getNode()
          .getParentIfKind(ts.SyntaxKind.PropertyAccessExpression)

        // Find "api.extend" references
        if (!access || access.getName() !== 'extend') {
          continue
        }

        const call = access.getParentIfKind(ts.SyntaxKind.CallExpression)
        if (call) {
          calls.push(call)
        }
      }
    }
  }

  return calls
}

function indent(depth: number, line: string) {
  return '  '.repeat(depth) + line
}
