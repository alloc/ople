import esbuild from 'rollup-plugin-esbuild'

const name = require('./package.json').main.replace(/\.js$/, '')

const bundle = (config) => ({
  ...config,
  input: 'src/ople.ts',
  external: (id) => !/^[./]/.test(id),
})

export default bundle({
  plugins: [esbuild()],
  output: [
    {
      file: `${name}.js`,
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: `${name}.mjs`,
      format: 'es',
      sourcemap: true,
    },
  ],
})
