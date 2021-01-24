import { dirname } from 'path'
import { crawl } from 'recrawl-sync'
import nodeResolve from '@rollup/plugin-node-resolve'
import esbuild from 'rollup-plugin-esbuild'
import dts from 'rollup-plugin-dts'

const configs = []
export default configs

const dtsPlugin = dts()
const esPlugin = esbuild()

const exts = { dts: 'd.ts', cjs: 'js', es: 'mjs' }
const entry = { dts: 'typings', cjs: 'main', es: 'module' }

crawl('.', {
  only: ['packages/*/package.json'],
  skip: ['node_modules'],
}).forEach(pkgPath => {
  console.log(pkgPath)

  let external = id => !/^[./]/.test(id)
  if (/nason/.test(pkgPath)) {
    const origExternal = external
    external = id => origExternal(id) && !/nason/.test(id)
  } else if (!/agent/.test(pkgPath)) {
    return
  }

  const pkg = require('./' + pkgPath)
  const pkgRoot = dirname(pkgPath)
  const bundle = format =>
    configs.push({
      input: `${pkgRoot}/src/index.ts`,
      output: {
        file: `${pkgRoot}/${pkg[entry[format]]}`,
        format: format == 'cjs' ? 'cjs' : 'es',
        sourcemap: format != 'dts',
      },
      plugins: format == 'dts' ? [dtsPlugin] : [esPlugin, nodeResolve({ extensions: ['.ts', '.js'] })],
      external,
    })

  if (pkg.module) bundle('es')
  if (pkg.main) bundle('cjs')
  if (pkg.typings) bundle('dts')
})
