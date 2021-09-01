// @ts-check
import { dirname } from 'path'
import { crawl } from 'recrawl-sync'
import nodeResolve from '@rollup/plugin-node-resolve'
import sucrase from '@rollup/plugin-sucrase'
import esbuild from 'rollup-plugin-esbuild'
import dts from 'rollup-plugin-dts'

/** @type import('rollup').RollupOptions[] */
const configs = []
export default configs

const dtsPlugin = dts({
  respectExternal: true,
})
// const esPlugin = esbuild({
//   target: 'es2018',
//   sourceMap: true,
// })
const esPlugin = sucrase({
  transforms: ['typescript'],
})
const resolvePlugin = nodeResolve({
  extensions: ['.ts', '.js'],
})

const enabledPackages = /backend|codegen|dev|transform/
//  /agent|backend|client|dev|init|pushpin|transform|tnetstring/

crawl('.', {
  only: ['packages/*/package.json'],
  skip: ['node_modules', 'vendor'],
}).forEach(pkgPath => {
  if (!enabledPackages.test(pkgPath)) {
    return
  }

  let external = id => !/^[./]/.test(id)
  if (/nason/.test(pkgPath)) {
    const origExternal = external
    external = id => origExternal(id) && !/nason/.test(id)
  }

  const pkg = require('./' + pkgPath)
  const pkgRoot = dirname(pkgPath)

  const input = `${pkgRoot}/${pkg.source || 'src/index.ts'}`

  /** @type any[] */
  let output = []

  if (pkg.main) {
    output.push({
      file: `${pkgRoot}/${pkg.main}`,
      format: 'cjs',
      exports: 'auto',
      sourcemap: true,
      sourcemapExcludeSources: true,
      externalLiveBindings: false,
    })
  }

  if (pkg.module) {
    output.push({
      file: `${pkgRoot}/${pkg.module}`,
      format: 'es',
      sourcemap: true,
      sourcemapExcludeSources: true,
    })
  }

  configs.push({
    input,
    output,
    plugins: [esPlugin, resolvePlugin],
    external,
  })

  configs.push({
    input,
    output: {
      file: `${pkgRoot}/${(pkg.main || pkg.module).replace(/.js$/, '.d.ts')}`,
      format: 'es',
    },
    plugins: [dtsPlugin],
    external,
  })

  if (pkg.name === '@ople/dev') {
    configs.push({
      input: crawl(`${pkgRoot}/src/cli`, {
        only: ['*.ts'],
        skip: ['app.ts'],
        absolute: true,
      }),
      output: {
        dir: `${pkgRoot}/dist/cli`,
        format: 'cjs',
        sourcemap: true,
        sourcemapExcludeSources: true,
        exports: 'named',
      },
      plugins: [esPlugin],
      external,
    })
  }
})
