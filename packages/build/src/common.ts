import * as os from 'os'
import * as path from 'path'
import resolve from 'resolve'
import {
  Node,
  NamedNode,
  ParameteredNode,
  ExportDeclaration,
  TypeAliasDeclaration,
  InterfaceDeclaration,
  TypeFormatFlags,
  SourceFile,
} from 'ts-morph'

export function getArgTypes(node: ParameteredNode, scope?: Node) {
  return node.getParameters().map(arg => {
    const argType = arg
      .getType()
      .getText(scope, TypeFormatFlags.UseFullyQualifiedType)

    return arg.getName() + ': ' + argType
  })
}

// The imported names by their aliases.
export type NamedImports = { [alias: string]: string }
// The named imports by their module paths.
export type ModuleImportMap = Map<string, NamedImports>
// The imported types by their local identifiers.
export type ImportedTypeMap = Map<string, Node & NamedNode>
// The imported type map of every importing file.
export type ImporterTypeMap = Map<SourceFile, ImportedTypeMap>

export type ExportedType =
  | ExportDeclaration
  | TypeAliasDeclaration
  | InterfaceDeclaration

export function getImportLines(
  importedTypes: Map<SourceFile, ImporterTypeMap>,
  sourceFile: SourceFile,
  watchPaths: Set<string>
) {
  const importsByPath: ModuleImportMap = new Map()

  importedTypes.forEach((importedTypes, importedFile) => {
    const namedExports = importedFile.getExportedDeclarations()
    const exportedNames = Array.from(namedExports.keys())

    importedTypes.forEach((types, importer) => {
      // Find the `import` declaration for the dependency.
      const importDecls = importer.getImportDeclarations()
      const importDecl = importDecls.find(
        // TODO: support re-exports
        decl => importedFile == decl.getModuleSpecifierSourceFileOrThrow()
      )

      let modulePath: string
      if (importDecl) {
        modulePath = importDecl.getModuleSpecifierValue()
        if (modulePath[0] == '.') {
          modulePath = sourceFile.getRelativePathAsModuleSpecifierTo(
            importedFile
          )
        }
      } else {
        modulePath = resolveImportSpecifier(importedFile, importer)
      }

      let namedImports = importsByPath.get(modulePath)!
      if (!namedImports) {
        importsByPath.set(modulePath, (namedImports = {}))
      }

      types.forEach((type, alias) => {
        const name = exportedNames.find(name =>
          namedExports.get(name)!.some(exported => type == exported)
        )
        if (name) {
          namedImports[alias] = name
        }
      })

      // Watch the importer for changes.
      watchPaths.add(importer.getFilePath())
    })

    // Watch the imported file for changes.
    watchPaths.add(importedFile.getFilePath())
  })

  const importLines: string[] = []

  importsByPath.forEach((namedImports, modulePath) => {
    const aliases = Object.keys(namedImports)
    if (aliases.length) {
      const defaultAlias = aliases.find(
        alias => namedImports[alias] == 'default'
      )
      if (defaultAlias) {
        importLines.push(`import type ${defaultAlias} from '${modulePath}'`)
      }
      if (!defaultAlias || aliases.length > 1) {
        let specs = ''
        for (let i = 0; i < aliases.length; i++) {
          const alias = aliases[i]
          if (alias !== defaultAlias) {
            const name = namedImports[alias]
            specs +=
              (i ? ', ' : '') + name + (name == alias ? '' : ' as ' + alias)
          }
        }
        importLines.push(`import type {${specs}} from '${modulePath}'`)
      }
    }
  })

  return importLines
}

export function resolveImportSpecifier(
  imported: SourceFile,
  importer: SourceFile
) {
  const project = importer.getProject()
  const rootDirs: string[] = project
    .getRootDirectories()
    .map(dir => dir.getPath())

  const importedPath: string = imported.getFilePath()
  const importerPath: string = importer.getFilePath()

  const isDependency = importedPath.includes('/node_modules/')
  const homeDir = isDependency && os.homedir()

  let parentDir = importedPath
  do {
    parentDir = path.dirname(parentDir)
    if (path.basename(parentDir) == 'node_modules') {
      const moduleId = path.relative(parentDir, importedPath)
      const packageId =
        moduleId[0] == '@'
          ? moduleId.split('/').slice(0, 2).join('/')
          : moduleId.split('/')[0]

      const packageRoot = path.join(parentDir, packageId)
      const packageData = require(path.join(packageRoot, 'package.json'))
      const mainPath = packageData.main
        ? resolve.sync(path.join(packageRoot, packageData.main))
        : path.join(parentDir, 'index.js')

      return stripExtension(importedPath) !== stripExtension(mainPath)
        ? stripExtension(moduleId).replace(/(\/index)$/, '')
        : packageId
    }
    if (isDescendant(importerPath, parentDir)) {
      return path.relative(importerPath, importedPath)
    }
  } while (
    isDependency
      ? parentDir !== homeDir && parentDir !== path.dirname(parentDir)
      : rootDirs.some(rootDir => isDescendant(parentDir, rootDir))
  )

  throw Error(
    `Failed to resolve import specifier for "${importedPath}" imported by "${importerPath}"`
  )
}

function stripExtension(filePath: string) {
  return filePath.replace(/(\.d\.ts|\.[jt]sx?)$/, '')
}

function isDescendant(childPath: string, parentDir: string) {
  return childPath == parentDir || childPath.startsWith(parentDir + path.sep)
}
