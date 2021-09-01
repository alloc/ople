import path from 'path'
import Module from 'module'
import { filespy } from 'filespy'
import { EventEmitter } from 'events'
import { debounce } from 'ts-debounce'
import { ts, Project, SourceFile, TypeNode } from 'ts-morph'
import { OpleCollection, parseCollections } from './parsers/database'
import { OpleFunction, parseFunctions } from './parsers/functions'
import { OpleSignal, parseSignals } from './parsers/signals'
import { resolveTypeImport } from './common'
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
  readonly projectDependencies = new Map<string, DependencyInfo>()
  readonly project = new Project({
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      types: [],
    },
  })

  constructor(readonly root: string) {
    super()

    const { project, functionsByFile } = this

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
              fun.node,
              `Function skipped. Name already taken: "${fun.name}"`
            )
          } else {
            functionMap[fun.name] = fun
          }
        }
      })
      this.functions = functionMap
    }

    // Only project files are keys to this.
    const dependenciesByFile = new Map<SourceFile, Set<string>>()
    const { projectDependencies } = this

    // Resolve dependencies in project files and add them to the type-checker.
    const collectDependencies = (
      file: SourceFile,
      deps = new Set<string>(),
      rootFile = file
    ) => {
      const filePath = file.getFilePath()
      const { resolve } = Module.createRequire(filePath)
      for (const decl of file.getImportDeclarations()) {
        const id = decl.getModuleSpecifierValue()
        try {
          const depPath = resolveTypeImport(id, resolve)
          if (deps.has(depPath) || depPath.startsWith(root + '/')) {
            continue
          }

          let depInfo = projectDependencies.get(depPath)
          if (!depInfo) {
            depInfo = { id, importers: new Set() }
            projectDependencies.set(depPath, depInfo)
          }
          depInfo.importers.add(rootFile)
          deps.add(depPath)

          // Find all dependencies with a recursive crawl.
          const depFile = project.addSourceFileAtPath(depPath)
          collectDependencies(depFile, deps, rootFile)
        } catch {
          warn(decl, `Imported module "${id}" has no type definitions`)
        }
      }
      if (file == rootFile) {
        // Remove unused dependencies.
        const prevDeps = dependenciesByFile.get(file) || new Set()
        for (const depPath of prevDeps) {
          if (!deps.has(depPath)) {
            const depInfo = projectDependencies.get(depPath)!
            depInfo.importers.delete(rootFile)
            if (!depInfo.importers.size) {
              projectDependencies.delete(depPath)
            }
          }
        }
        // Cache the newly collected dependencies.
        dependenciesByFile.set(file, deps)
      }
    }

    let emitUpdate = (() => {}) as { (): void; cancel(): void }
    emitUpdate.cancel = () => {}

    const initPath = 'ople.init.ts'
    const watcher = filespy(root, {
      only: [initPath, 'backend/functions/**.ts'],
      skip: ['node_modules', '.git'],
    })
      .on('create', name => {
        const filePath = path.join(root, name)
        const file = project.addSourceFileAtPath(filePath)
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
        const filePath = path.join(root, name)
        const file = project.getSourceFile(filePath)
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
        const filePath = path.join(root, name)
        const file = project.getSourceFile(filePath)
        if (file) {
          project.removeSourceFile(file)
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
