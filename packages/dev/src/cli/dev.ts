import log from 'lodge'
import path from 'path'
import babel from '@rollup/plugin-babel'
import sucrase from '@rollup/plugin-sucrase'
import nodeResolve from '@rollup/plugin-node-resolve'
import * as net from 'net'
import * as http from 'http'
import * as vite from 'vite'
import * as rollup from 'rollup'
import convertSourceMap from 'convert-source-map'
import { startTask } from 'misty/task'
import { createPushpin } from 'pushpin-mock'
import { generateServer } from '@ople/codegen'
import { babelOpleFunctions } from '@ople/transform'
import { generateModules } from '../dev/watch'
import { init } from '../dev/init'
import { relativeToCwd } from '../common'
import { createSandbox } from '../dev/sandbox'

export default async function () {
  const [opleConfig, opleEnv] = await init()

  const projectRoot = process.cwd()
  const backendPort = 5000
  const backendRoot = path.resolve(
    projectRoot,
    opleConfig.clients.backend.backendPath
  )

  let opleServer: Promise<http.Server | null> = Promise.resolve(null)

  // TODO: find package.json with "vite" in devDependencies
  const viteServer = await vite.createServer({
    root: projectRoot,
  })

  await viteServer.listen()
  const viteHttpServer = viteServer.httpServer!
  const viteAddress = viteHttpServer.address() as net.AddressInfo

  const pushpinPath = '/@ople-dev'

  log('')
  const codegen = await generateModules(
    projectRoot,
    opleConfig.clients.backend.outPath,
    opleConfig.clients.database.outPath,
    `ws://localhost:${viteAddress.port}${pushpinPath}`
  )

  const pushpin = createPushpin({
    path: pushpinPath,
    gripSecret: opleEnv.gripSecret,
    originUrl: `http://localhost:${backendPort}`,
    server: viteHttpServer,
  })

  const entryId = 'ople-entry.js'
  const entryPath = path.join(backendRoot, entryId)

  const entryPlugin: rollup.Plugin = {
    name: `ople-entry`,
    resolveId(id, importer) {
      if (id === entryId) {
        return entryPath
      }
    },
    load(id) {
      if (id === entryPath) {
        return generateServer({
          cwd: backendRoot,
          dev: true,
          port: backendPort,
          gripSecret: opleEnv.gripSecret,
          imports: Object.keys(codegen.functionsByFile).map(filePath =>
            relativeToCwd(filePath.replace(/\.ts$/, ''), backendRoot)
          ),
        })
      }
    },
  }

  const getOpleFunction = (name: string) => codegen.functions[name]

  const watcher = rollup.watch({
    input: entryId,
    plugins: [
      babel({
        extensions: ['.js', '.mjs', '.ts'],
        exclude: 'node_modules/**',
        plugins: [
          '@babel/plugin-syntax-typescript',
          [babelOpleFunctions, { getOpleFunction }],
        ],
        skipPreflightCheck: true,
        babelHelpers: 'bundled',
        sourceMaps: true,
      }),
      entryPlugin,
      nodeResolve(),
      sucrase({
        transforms: ['typescript'],
      }),
    ],
    external: id => !/^[./]/.test(id),
    watch: {
      skipWrite: true,
      clearScreen: false,
    },
  })

  watcher.on('event', async event => {
    if (event.code == 'BUNDLE_END') {
      const bundle = event.result
      const bundled = await bundle.generate({
        dir: backendRoot,
        format: 'cjs',
        exports: 'auto',
        externalLiveBindings: false,
        sourcemap: 'inline',
      })

      const map: any = bundled.output[0].map
      map.sourceRoot = backendRoot

      const code =
        bundled.output[0].code + convertSourceMap.fromObject(map).toComment()

      opleServer = runOpleServer(code).catch(err => {
        log.error(err)
        return null
      })
    } else if (event.code == 'ERROR') {
      log.error(event.error)
    }
  })

  async function runOpleServer(code: string) {
    const task = startTask('Starting server...')
    const oldServer = await opleServer
    if (oldServer) {
      task.update('Restarting server...')
      await new Promise<void>((resolve, reject) =>
        oldServer.close(err => (err ? reject(err) : resolve()))
      )
    }

    const processEnv = { ...process.env }
    const sandbox = createSandbox({
      sharedModules: ['ople-db', 'dotenv'],
      global: {
        // Override `process.env` so that dotenv doesn't trip over
        // variables set by previous server instances.
        process: new Proxy(process, {
          get: (_, key: keyof NodeJS.Process) =>
            key == 'env' ? processEnv : process[key],
        }),
      },
    })

    type Serve = (config: typeof pushpin) => http.Server
    const serve: Serve = sandbox.load(code, entryPath)

    return new Promise<http.Server>((resolve, reject) => {
      const server = serve(pushpin).on('error', reject)
      server.on('listening', () => {
        task.finish(
          `Ople ready @ ` + log.lgreen(`http://localhost:${backendPort}`)
        )
        resolve(server)
      })
    })
  }
}
