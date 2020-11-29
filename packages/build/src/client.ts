import {
  Project,
  Node,
  ts,
  TypeFormatFlags,
  TypeNode,
  CallExpression,
  SourceFile,
  StructureKind,
  Type,
} from 'ts-morph'
import { join, resolve, relative, isAbsolute } from 'path'
import dedent from 'dedent'
import {
  getArgTypes,
  ImporterTypeMap,
  ExportedType,
  getImportLines,
} from './common'

type ParsedAction = {
  name: string
  args: string[]
  returnType: string
  docs?: string
}

type BuildError =
  | { type: 'module_not_found'; path: string }
  | { type: 'no_main_field' }

type BuildOptions = {
  onError: (error: BuildError) => void
}

export interface ClientBuilderProps {
  /** The project root */
  cwd?: string
  /** The destination path of the generated schema */
  path?: string
  /** The name of the exported `createClient` result */
  clientExportId?: string
}

// TODO: split out scanning logic into `ActionScanner` class
// TODO: refactor `build` method into `buildClient` function that takes an `ActionScanner` object
export class ClientBuilder {
  pkg: any
  props: Required<ClientBuilderProps>
  project: Project

  /** All methods passed to an `api.extend` call */
  actions: { [name: string]: ParsedAction } = {}

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
    path = 'schema/index.d.ts',
    clientExportId = 'client',
  }: ClientBuilderProps = {}) {
    cwd = resolve(cwd)
    if (isAbsolute(path)) {
      path = relative(cwd, path)
    }
    this.pkg = require(resolve(cwd, 'package.json'))
    this.props = { cwd, path, clientExportId }
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
  build(opts: BuildOptions) {
    const {
      props,
      project,
      importedTypes,
      declaredTypes,
      exportedTypes,
      watchPaths,
    } = this

    const getFile = (file: string) =>
      project.addSourceFileAtPathIfExists(file) ||
      project.createSourceFile(file)

    const schemaPath = join(props.cwd, props.path)
    const schemaFile = getFile(schemaPath)
    const schemaImpl = getFile(schemaPath.replace(/\.d\.ts$/, '.js'))

    // Reset our state.
    this.actions = {}
    this.visited.clear()
    importedTypes.clear()
    declaredTypes.clear()
    exportedTypes.clear()
    watchPaths.clear()

    // Watch the tsconfig for changes.
    watchPaths.add(join(props.cwd, 'tsconfig.json'))

    if (this.pkg.main) {
      const mainPath = resolve(props.cwd, this.pkg.main)
      const mainModule = project.addSourceFileAtPathIfExists(mainPath)
      if (mainModule) {
        this.collectExportedTypes(mainModule)
      } else {
        opts.onError({ type: 'module_not_found', path: mainPath })
      }
    } else {
      opts.onError({ type: 'no_main_field' })
    }

    const disclaimer = dedent`
      //
      // THIS IS A GENERATED FILE. DO NOT TOUCH!
      //
    `

    // Collect the actions of every "api.extend" call.
    const calls = findExtendCalls(project, watchPaths)
    calls.forEach(this.collectActions)

    const { clientExportId } = props
    const actionIds = JSON.stringify(Object.keys(this.actions))

    // Create the API client.
    schemaImpl.removeText()
    schemaImpl.addStatements([
      disclaimer,
      dedent`
        import {createClient} from '@ople/client'

        export const ${clientExportId} = createClient(${actionIds})
      `,
    ])

    const importLines = getImportLines(importedTypes, schemaFile, watchPaths)
    const actionLines: string[] = []

    for (const { name, args, returnType, docs } of Object.values(
      this.actions
    )) {
      if (docs) actionLines.push(docs.replace(/\n\s+/g, '\n   '))
      actionLines.push(
        `${name}(${args.join(', ')}): ` +
          (returnType.startsWith('Promise<')
            ? returnType
            : `Promise<${returnType}>`)
      )
    }

    schemaFile.removeText()
    schemaFile.addStatements([
      disclaimer,
      `import {Client} from '@ople/client'`,
      importLines.join('\n'),
      `\n`,
      `export const ${clientExportId}: Client<Actions, Events>`,
      `\n`,
      // Declare the actions.
      `export interface Actions {`,
      actionLines.map(line => '  ' + line).join('\n'),
      `}`,
      ``,
      // TODO: Declare server-sent events.
      `export interface Events {}`,
      schemaText => {
        // Print the exported types.
        if (exportedTypes.size) {
          schemaText.newLine()
          exportedTypes.forEach(node => {
            if (Node.isExportDeclaration(node)) {
              // Rewrite the module path in case it's relative.
              const from = node.getModuleSpecifierSourceFile()
              if (from) {
                node.setModuleSpecifier(
                  schemaFile.getRelativePathAsModuleSpecifierTo(from)
                )
              }
            }
            schemaText.writeLine(node.print())
          })
        }
        // Print the declared types.
        if (declaredTypes.size) {
          schemaText.newLine()
          declaredTypes.forEach(node => {
            schemaText.writeLine(node.getText())
          })
        }
      },
    ])

    return {
      save: () =>
        Promise.all(
          [schemaFile, schemaImpl].map(file => file.save().then(() => file))
        ),
    }
  }

  /** Collect actions from an `api.extend` call. */
  collectActions = (call: CallExpression) => {
    const [actionsObject] = call.getArguments()
    if (!Node.isObjectLiteralExpression(actionsObject)) {
      console.warn(
        'Expected an object literal as the 1st argument of "api.extend"'
      )
      return null
    }

    actionsObject.getSourceFile().formatText({
      semicolons: ts.SemicolonPreference.Remove,
    })

    const { actions } = this

    const getText = (node: Type) =>
      node.getText(call, TypeFormatFlags.UseFullyQualifiedType)

    for (const elem of actionsObject.getProperties()) {
      if (!Node.isMethodDeclaration(elem)) {
        continue
      }

      const name = elem.getName()
      if (actions[name]) {
        console.warn(`Overwriting an existing action: "${name}"`)
      }

      const method = elem.getStructure()
      if (
        method.kind !== StructureKind.MethodOverload &&
        (method.overloads?.length || 0) > 0
      ) {
        continue
      }

      actions[name] = {
        name,
        args: getArgTypes(elem, call),
        returnType: getText(elem.getReturnType()),
        docs: elem.getJsDocs()[0]?.getText(),
      }

      this.collectTypes(elem)
    }
  }

  /** Collect types to be declared or imported. */
  collectTypes(root: Node | undefined, importer = root?.getSourceFile()) {
    if (!root) return

    const recurse = (node: Node | undefined) =>
      this.collectTypes(node, importer)

    if (TypeNode.isIdentifier(root) || TypeNode.isTypeReferenceNode(root)) {
      const alias = root.getText()

      const { declaredTypes, importedTypes } = this
      const lang = root.getProject().getLanguageService()

      for (const def of lang.getDefinitions(root)) {
        const type = def.getNode().getParent()!
        if (!Node.isNamedNode(type)) {
          continue
        }
        const file = def.getSourceFile()
        if (file == importer) {
          if (!declaredTypes.has(type)) {
            declaredTypes.add(type)
            recurse(type)
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
            types.set(alias, type)
          }
        }
      }
    } else if (
      !Node.isIdentifier(root) &&
      !Node.isExpression(root) &&
      !Node.isBlock(root) &&
      !this.visited.has(root)
    ) {
      this.visited.add(root)
      root.forEachChild(recurse)
    }
  }
}

/** Find every `api.extend` call in the project. */
function findExtendCalls(project: Project, watchPaths: Set<string>) {
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
