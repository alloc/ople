import { dirname } from 'path'
import { crawl } from 'recrawl-sync'
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
      plugins: format == 'dts' ? [dtsPlugin] : [esPlugin],
      external: id => !/^[./]/.test(id),
    })

  if (pkg.module) bundle('es')
  if (pkg.main) bundle('cjs')
  if (pkg.typings) bundle('dts')
})
