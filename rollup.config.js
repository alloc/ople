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

const enabledPackages = /codegen|dev/
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
  let output = {
    file: `${pkgRoot}/${pkg.main}`,
    format: 'cjs',
    exports: 'auto',
    sourcemap: true,
    externalLiveBindings: false,
  }
  if (pkg.module) {
    output = [output]
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
      file: `${pkgRoot}/${pkg.main.replace(/.js$/, '.d.ts')}`,
      format: 'es',
    },
    plugins: [dtsPlugin],
    external,
  })

  if (pkg.name === '@ople/dev') {
    configs.push({
      input: `${pkgRoot}/src/cli/main.ts`,
      output: {
        file: `${pkgRoot}/dist/cli.js`,
        format: 'cjs',
        sourcemap: true,
      },
      plugins: [esPlugin],
      external,
    })
  }
})
