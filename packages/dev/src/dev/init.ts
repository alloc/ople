import fs from 'saxon'
import path from 'path'
import esbuild from 'rollup-plugin-esbuild'
import nodeResolve from '@rollup/plugin-node-resolve'
import { rollup } from 'rollup'
import { db, write } from 'ople-db'
import { createSandbox } from './sandbox'

/**
 * Execute the local `ople.init.ts` module.
 */
export async function init() {
  const initFile = 'ople.init.ts'
  if (!fs.exists(initFile)) {
    throw Error(`"${initFile}" not found`)
  }

  const initPath = path.resolve(initFile)
  console.log(initPath)
  const bundle = await rollup({
    input: initPath,
    plugins: [
      nodeResolve(),
      esbuild({
        target: 'node14',
      }),
    ],
  })

  const bundled = await bundle.generate({
    format: 'cjs',
    sourcemap: 'inline',
  })

  const global = {
    ople: {
      config: null as OpleConfig | null,
      env: null as OpleEnv | null,
    },
  }

  const sandbox = createSandbox({ global })
  sandbox.load(bundled.output[0].code, initPath)

  const opleConfig = global.ople.config!
  const opleEnv = global.ople.env
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
