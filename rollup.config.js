import { dirname } from 'path'
import { crawl } from 'recrawl-sync'
import nodeResolve from '@rollup/plugin-node-resolve'
import esbuild from 'rollup-plugin-esbuild'
import dts from 'rollup-plugin-dts'

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

crawl('.', {
  only: ['packages/*/package.json'],
  skip: ['node_modules', 'vendor'],
}).forEach(pkgPath => {
  let external = id => !/^[./]/.test(id)
  if (/nason/.test(pkgPath)) {
    const origExternal = external
    external = id => origExternal(id) && !/nason/.test(id)
  } else if (
    !/agent|backend|client|config|data|pushpin|transform|tnetstring/.test(
      pkgPath
    )
  ) {
    return
  }

  const pkg = require('./' + pkgPath)
  const pkgRoot = dirname(pkgPath)

  let input = `${pkgRoot}/${pkg.source || 'src/index.ts'}`
  let output = {
    file: `${pkgRoot}/${pkg.main}`,
    format: 'cjs',
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
})
