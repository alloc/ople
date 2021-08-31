import vm from 'vm'
import babel from '@rollup/plugin-babel'
import esbuild from 'rollup-plugin-esbuild'
import * as vite from 'vite'
import * as rollup from 'rollup'
import { createPushpin } from 'pushpin-mock'
import { generateServer } from '@ople/codegen'
// import { makeOriginContext } from '@ople/backend'
import { babelOpleClient } from '@ople/transform'
import { generateModules } from '../dev/watch'
import { init } from '../dev/init'
import { app } from './app'

const port = 5000

app.command('dev').action(async () => {
  const [opleConfig, opleEnv] = await init()

  const codegen = await generateModules(
    process.cwd(),
    opleConfig.clients.backend.outPath
  )

  const viteServer = await vite.createServer({
    plugins: [
      babel({
        plugins: [babelOpleClient],
      }),
    ],
  })

  const pushpin = createPushpin({
    path: `/@ople-dev`,
    gripSecret: opleEnv.gripSecret,
    originUrl: `http://localhost:${port}`,
    server: viteServer,
  })

  const entryPath = '\0.ople-entry.js'
  const entryPlugin: rollup.Plugin = {
    name: `ople-entry`,
    resolveId(id) {
      return id === entryPath ? id : null
    },
    load(id) {
      if (id === entryPath) {
        return generateServer({
          imports: Array.from(codegen.functionsByFile.keys(), file =>
            file.getFilePath()
          ),
          port,
        })
      }
    },
  }

  const watcher = rollup.watch({
    input: entryPath,
    plugins: [entryPlugin, esbuild({ target: 'node16' })],
  })

  watcher.on('event', event => {
    if (event.code == 'BUNDLE_END') {
      const bundle = event.result
      console.log(bundle)
      debugger
    }
  })
})
