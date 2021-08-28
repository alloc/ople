import vm from 'vm'
import babel from '@rollup/plugin-babel'
import esbuild from 'rollup-plugin-esbuild'
import * as vite from 'vite'
import * as rollup from 'rollup'
import { createPushpin } from 'pushpin-mock'
import { generateServer } from '@ople/codegen'
import { makeOriginContext } from '@ople/backend'
import { babelOpleClient } from '@ople/transform'
import { init } from '../dev/init'
import { app } from './app'

const port = 5000

app.command('dev').action(async () => {
  const [opleConfig, opleEnv] = await init()

  const viteServer = await vite.createServer({
    plugins: [
      babel({
        plugins: [babelOpleClient],
      }),
    ],
  })

  const pushpin = createPushpin({
    path: `/@ople-dev`,
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
          imports: [],
          port,
        })
      }
    },
  }

  const watcher = rollup.watch({
    input: `ople-entry.js`,
    plugins: [],
  })

  watcher.on('event', event => {
    if (event.code == 'BUNDLE_END') {
      event.result
    }
  })
})
