import vm from 'vm'
import fs from 'saxon'
import path from 'path'
import Module from 'module'
import esbuild from 'rollup-plugin-esbuild'
import { rollup } from 'rollup'
import { db, write } from 'ople-db'

const getModuleCache = (): Record<string, any> => (Module as any)._cache
const setModuleCache = (cache: Record<string, any>) =>
  ((Module as any)._cache = cache)

/**
 * Execute the local `ople.init.ts` module.
 */
export async function init() {
  const initFile = 'ople.init.ts'
  if (!fs.exists(initFile)) {
    throw Error(`"${initFile}" not found`)
  }

  const initPath = path.resolve(initFile)
  const bundle = await rollup({
    input: initPath,
    plugins: [
      esbuild({
        target: 'node14',
      }),
    ],
  })

  const bundled = await bundle.generate({
    format: 'cjs',
    sourcemap: 'inline',
  })

  const require = Module.createRequire(initPath)
  const sandboxModules: Record<string, any> = {}
  const sandbox = {
    require(id: string) {
      const modulePath = require.resolve(id)
      let mod = sandboxModules[modulePath]
      if (!mod) {
        const modules = getModuleCache()
        setModuleCache(sandboxModules)
        try {
          mod = require(modulePath)
        } finally {
          setModuleCache(modules)
        }
      }
      return mod
    },
    ople: {
      config: null as OpleConfig | null,
      env: null as OpleEnv | null,
    },
  }

  vm.runInNewContext(bundled.output[0].code, sandbox, {
    filename: initPath,
  })

  const opleConfig = sandbox.ople.config!
  const opleEnv = sandbox.ople.env
  if (!opleEnv) {
    throw Error(`"setEnv" must be called in ${initFile}`)
  }

  // Ensure collections exist.
  write(() => {
    for (const name of opleConfig.collections) {
      if (!db.hasCollection(name)) {
        db.createCollection(name)
      }
    }
  })

  return [opleConfig, opleEnv] as const
}
