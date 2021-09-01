import fs from 'fs'
import vm from 'vm'
import path from 'path'
import Module from 'module'

const parentRequire = require

export type SandboxOptions = {
  sharedModules?: string[]
  global?: Record<string, any>
}

export interface Sandbox {
  global: Record<string, any>
  context: vm.Context
  moduleCache: Record<string, Module>
  mainModule?: Module
  load(code: string, filename: string, parentModule?: Module): any
}

export function createSandbox(options: SandboxOptions): Sandbox {
  const { global = {}, sharedModules = [] } = options
  global.global = global
  global.process = process
  return {
    global,
    context: vm.createContext(global),
    moduleCache: createModuleCache(sharedModules),
    load(code, filename, parentModule) {
      const { resolve } = Module.createRequire(filename)

      const module = new Module(filename, parentModule)
      this.moduleCache[filename] = module
      module.filename = filename

      if (filename.endsWith('.json')) {
        module.exports = JSON.parse(code)
        return module.exports
      }

      this.mainModule ??= module
      module.require = makeRequireFunction(
        module,
        resolve,
        require.extensions,
        this
      )

      const moduleArgs = {
        exports: module.exports,
        require: module.require,
        module,
        __filename: filename,
        __dirname: path.dirname(filename),
      }

      code = `(0,function(${Object.keys(moduleArgs).join(',')}){\n${code}\n})`
      const compiledWrapper: Function = vm.runInContext(code, this.context, {
        filename,
      })

      compiledWrapper.apply(module.exports, Object.values(moduleArgs))
      return module.exports
    },
  }
}

export function createModuleCache(sharedModules: string[]) {
  return sharedModules.reduce((moduleCache, id) => {
    const resolvedId = require.resolve(id)

    // Initialize the module on-demand.
    Object.defineProperty(moduleCache, resolvedId, {
      get() {
        require(resolvedId)
        return getCachedModule(resolvedId)
      },
    })

    return moduleCache
  }, {} as Record<string, Module>)
}

function getCachedModule(filename: string): Module | undefined {
  return (Module as any)._cache[filename]
}

function makeRequireFunction(
  parentModule: Module,
  resolve: NodeJS.RequireResolve,
  extensions: NodeJS.RequireExtensions,
  sandbox: Sandbox
): NodeJS.Require {
  function require(id: string) {
    if (Module.builtinModules.includes(id)) {
      return parentRequire(id)
    }
    const filename = resolve(id)
    const module = sandbox.moduleCache[filename]
    if (module) {
      return module.exports
    }
    const code = fs.readFileSync(filename, 'utf8')
    return sandbox.load(code, filename, parentModule)
  }
  require.main = sandbox.mainModule
  require.cache = sandbox.moduleCache
  require.resolve = resolve
  require.extensions = extensions
  return require
}
