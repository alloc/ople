import path from 'path'
import Module from 'module'
import { filespy } from 'filespy'
import { EventEmitter } from 'events'
import { debounce } from 'ts-debounce'
import { ts, Project, SourceFile, Node } from 'ts-morph'
import { OpleCollection, parseCollections } from './parsers/database'
import { OpleFunction, parseFunctions } from './parsers/functions'
import { OpleSignal, parseSignals } from './parsers/signals'
import { getNameNode, resolveTypeImport } from './common'
import { warn } from './warnings'

export async function createParser(root: string) {
  const parser = new OpleParser(root)
  return new Promise<OpleParser>(resolve => {
    parser.on('ready', () => resolve(parser))
  })
}

type DependencyInfo = {
  id: string
  importers: Set<SourceFile>
}

export class OpleParser extends EventEmitter {
  signals: Record<string, OpleSignal> = {}
  functions: Record<string, OpleFunction> = {}
  collections: Record<string, OpleCollection> = {}
  readonly functionsByFile = new Map<SourceFile, OpleFunction[]>()
  readonly dependencies = new Map<SourceFile, DependencyInfo>()

  constructor(readonly root: string) {
    super()

    const initProject = new Project({
      tsConfigFilePath: path.resolve(root, 'tsconfig.json'),
    })
    const backendProject = new Project({
      tsConfigFilePath: path.resolve(root, 'backend/tsconfig.json'),
    })

    const { functionsByFile } = this

    const updateCollections = (initFile: SourceFile) => {
      this.collections = {}
      for (const coll of parseCollections(initFile)) {
        if (coll.name in this.collections) {
          warn(
            coll.node,
            `Collection skipped. Name already taken: "${coll.name}"`
          )
        } else {
          this.collections[coll.name] = coll
        }
      }
    }

    const updateSignals = (initFile: SourceFile) => {
      this.signals = {}
      for (const signal of parseSignals(initFile)) {
        if (signal.name in this.signals) {
          warn(
            signal.node,
            `Signal skipped. Name already taken: "${signal.name}"`
          )
        } else {
          this.signals[signal.name] = signal
        }
      }
    }

    const updateFunctions = () => {
      const functionMap: Record<string, OpleFunction> = {}
      this.functionsByFile.forEach(functions => {
        for (const fun of functions) {
          if (fun.name in functionMap) {
            warn(
              getNameNode(fun.node) || fun.node,
              `Function skipped. Name already taken: "${fun.name}"`
            )
          } else {
            functionMap[fun.name] = fun
          }
        }
      })
      this.functions = functionMap
    }

    // Only internal modules are keys to this.
    const dependenciesByFile = new Map<SourceFile, Set<SourceFile>>()
    const { dependencies } = this

    // Collect external modules and associate them with the internal modules
    // that depend on them (directly or transiently).
    const collectDependencies = (
      file: SourceFile,
      deps = new Set<SourceFile>(),
      rootFile = file
    ) => {
      for (const decl of file.getImportDeclarations()) {
        const id = decl.getModuleSpecifierValue()
        const dep = decl.getModuleSpecifierSourceFile()
        if (!dep) {
          warn(decl, `Imported module "${id}" has no type definitions`)
          continue
        }
        const depPath = dep.getFilePath()
        if (
          depPath.startsWith(root + '/') &&
          !depPath.includes('/node_modules/')
        ) {
          continue // Only interested in external modules.
        }

        let depInfo = dependencies.get(dep)
        if (!depInfo) {
          depInfo = { id, importers: new Set() }
          dependencies.set(dep, depInfo)
        }
        depInfo.importers.add(rootFile)
        deps.add(dep)

        // Find all dependencies with a recursive crawl.
        collectDependencies(dep, deps, rootFile)
      }
      if (file == rootFile) {
        cleanDependencies(file, deps)
        dependenciesByFile.set(file, deps)
      }
    }

    // Remove unused dependencies.
    const cleanDependencies = (file: SourceFile, deps: Set<SourceFile>) => {
      const prevDeps = dependenciesByFile.get(file) || new Set()
      for (const dep of prevDeps) {
        if (!deps.has(dep)) {
          const depInfo = dependencies.get(dep)!
          depInfo.importers.delete(file)
          if (!depInfo.importers.size) {
            dependencies.delete(dep)
          }
        }
      }
    }

    let emitUpdate = (() => {}) as { (): void; cancel(): void }
    emitUpdate.cancel = () => {}

    const initPath = 'ople.init.ts'
    const getProject = (name: string) =>
      name == initPath ? initProject : backendProject

    const watcher = filespy(root, {
      only: [initPath, 'backend/functions/**.ts'],
      skip: ['node_modules', '.git'],
    })
      .on('create', name => {
        const project = getProject(name)
        const file = project.addSourceFileAtPath(path.join(root, name))
        collectDependencies(file)
        if (name == initPath) {
          updateCollections(file)
          updateSignals(file)
        } else {
          functionsByFile.set(file, parseFunctions(file))
        }
        emitUpdate()
      })
      .on('update', name => {
        const project = getProject(name)
        const file = project.getSourceFile(path.join(root, name))
        if (file) {
          file.refreshFromFileSystemSync()
          collectDependencies(file)
          if (name == initPath) {
            updateCollections(file)
            updateSignals(file)
          } else {
            functionsByFile.set(file, parseFunctions(file))
          }
          emitUpdate()
        }
      })
      .on('delete', name => {
        const project = getProject(name)
        const file = project.getSourceFile(path.join(root, name))
        if (file) {
          project.removeSourceFile(file)
          cleanDependencies(file, new Set())
          dependenciesByFile.delete(file)
          if (name == initPath) {
            this.collections = {}
            this.signals = {}
          } else {
            functionsByFile.delete(file)
          }
          emitUpdate()
        }
      })
      .on('ready', () => {
        if (!closed) {
          updateFunctions()
          this.emit('ready')
          emitUpdate = debounce(() => {
            updateFunctions()
            this.emit('update')
          }, 200)
        }
      })
      .on('error', err => {
        if (!closed) {
          console.error(err)
          this.close()
        }
      })

    let closed = false
    this.close = () => {
      closed = true
      emitUpdate.cancel()
      return watcher.close()
    }
  }
}

export interface OpleParser {
  on(name: 'ready', handler: () => void): this
  /** The project is updating. */
  on(name: 'update', handler: () => void): this
  /** Stop watching for changes. */
  close: () => Promise<void>
}
