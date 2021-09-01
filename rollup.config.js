import { dirname } from 'path'
import { crawl } from 'recrawl-sync'
import nodeResolve from '@rollup/plugin-node-resolve'
import esbuild from 'rollup-plugin-esbuild'
import dts from 'rollup-plugin-dts'

/** @type import('rollup').RollupOptions[] */
const configs = []
export default configs

const dtsPlugin = dts({
  respectExternal: true,
})
const esPlugin = esbuild({
  target: 'es2018',
})
const resolvePlugin = nodeResolve({
  extensions: ['.ts', '.js'],
})

const enabledPackages = /agent|backend|client|codegen|dev/
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

  let input = `${pkgRoot}/${pkg.source || 'src/index.ts'}`
  let output = []

  if (pkg.main) {
    output.push({
      file: `${pkgRoot}/${pkg.main}`,
      format: 'cjs',
      exports: 'auto',
      sourcemap: true,
      externalLiveBindings: false,
    })
  }

  if (pkg.module) {
    output.push({
      file: `${pkgRoot}/${pkg.module}`,
      format: 'es',
      sourcemap: true,
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
        exports: 'named',
      },
      plugins: [esPlugin],
      external,
    })
  }
})
