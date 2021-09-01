import fs from 'saxon'
import path from 'path'
import esbuild from 'rollup-plugin-esbuild'
import nodeResolve from '@rollup/plugin-node-resolve'
import convertSourceMap from 'convert-source-map'
import { rollup } from 'rollup'
import { db, write } from 'ople-db'
import { createSandbox } from './sandbox'

/**
 * Execute the local `ople.init.ts` module.
 */
export async function init(cwd = process.cwd()) {
  const initFile = 'ople.init.ts'
  const initPath = path.resolve(cwd, initFile)

  if (!fs.exists(initPath)) {
    throw Error(`"${initFile}" not found`)
  }

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
    sourcemapExcludeSources: true,
  })

  const map: any = bundled.output[0].map
  map.sourceRoot = cwd

  const code =
    bundled.output[0].code + convertSourceMap.fromObject(map).toComment()

  const global = {
    ople: {
      config: null as OpleConfig | null,
      env: null as OpleEnv | null,
    },
  }

  const sandbox = createSandbox({ global })
  sandbox.load(code, initPath)

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
