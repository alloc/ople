import path from 'path'
import launch from 'smart-restart'
import debounce from 'debounce'
import { watch } from 'chokidar'
import { ClientBuilder } from '../generate/client'
import { QueryScanner } from '../generate/queries'
import { app } from '../core'
import { log } from '../log'
import exec from '@cush/exec'
import fs from 'saxon/sync'
import {
  relativeToHome,
  PackageJson,
  italic,
  relativeToCwd,
  OpleConfig,
  getCommandPath,
} from '../common'
import createUid from 'uid'

interface Flags {
  port?: number
  debug?: boolean
}

app
  .command('start', 'Start the dev server')
  .option('--port,-p [port]', 'The server port')
  .option('--debug', 'Debug the server')
  .action(async ({ port, debug }: Flags) => {
    await checkDocker()

    const pkgPath = path.resolve('package.json')
    log('using', log.lgreen(relativeToHome(pkgPath)))

    const pkg: PackageJson = require(pkgPath)
    const config = pkg.ople
    if (!config?.serverId) {
      throw fatal('missing "ople.serverId" field in package.json')
    }

    config.port = port || config.port || 8000

    generateQueries(config)
    generateClient(config)

    await startFauna(config)
    await startPushpin(config)

    launch({
      main: path.resolve(pkg.main),
      command: require.resolve('sucrase/bin/sucrase-node'),
      spawnOptions: {
        env: {
          PATH: process.env.PATH,
          PORT: '' + config.port,
          GRIP_SIG: config.gripSig,
          FORCE_COLOR: '1',
          NODE_OPTIONS: getNodeOptions(debug),
        },
      },
    })
  })

function getNodeOptions(debug?: boolean) {
  let opts = `-r ${require.resolve('source-map-support/register')}`
  if (debug) opts += ' --inspect'
  return opts
}

function generateClient(config: OpleConfig) {
  const clientPath = config.clientModuleId
  const schema = new ClientBuilder({
    cwd: process.cwd(),
    path: path.resolve(clientPath + '.d.ts'),
    clientExportId: config.clientExportId,
  })

  const schemaWatcher = watch([], {})

  const rebuild = debounce(() => {
    const watchPaths = Array.from(schema.watchPaths)

    log(log.gray('building client...'))
    const schemaFile = schema.build()

    // Save asynchronously.
    schemaFile
      .save()
      .then(files =>
        files.forEach(file => {
          log('saved', log.lgreen(relativeToCwd(file.getFilePath())))
        })
      )
      .catch(console.error)

    // Find old paths to stop watching.
    watchPaths.forEach(watchedPath => {
      if (!schema.watchPaths.has(watchedPath)) {
        schemaWatcher.unwatch(watchedPath)
      }
    })

    // Find new paths to watch.
    schema.watchPaths.forEach(watchPath => {
      if (!watchPaths.includes(watchPath)) {
        schemaWatcher.add(watchPath)
      }
    })
  }, 200)

  schemaWatcher.on('change', filePath => {
    const file = schema.project.getSourceFile(filePath)
    if (file && file.refreshFromFileSystemSync()) {
      rebuild()
    }
  })

  rebuild()
}

function generateQueries(config: OpleConfig) {
  const scanner = new QueryScanner({
    cwd: process.cwd(),
    outDir: config.queriesRoot,
  })

  const watcher = watch([], {})
  const rebuild = debounce(() => {
    const watchedPaths = Array.from(scanner.watchPaths)

    log(log.gray('building queries...'))
    const queriesModules = scanner.build()

    // Save asynchronously.
    Promise.all(
      queriesModules.map(file =>
        file
          .save()
          .then(() =>
            log('saved', log.lgreen(relativeToCwd(file.getFilePath())))
          )
      )
    ).catch(console.error)

    // Find old paths to stop watching.
    watchedPaths.forEach(watchedPath => {
      if (!scanner.watchPaths.has(watchedPath)) {
        watcher.unwatch(watchedPath)
      }
    })

    // Find new paths to watch.
    scanner.watchPaths.forEach(watchPath => {
      if (!watchedPaths.includes(watchPath)) {
        watcher.add(watchPath)
      }
    })
  }, 200)

  watcher.on('change', filePath => {
    const file = scanner.project.getSourceFile(filePath)
    if (file) {
      file.refreshFromFileSystemSync()
      rebuild()
    }
  })

  rebuild()
}

async function checkDocker() {
  if (!getCommandPath('docker')) {
    const link = 'https://www.docker.com/products/docker-desktop'
    throw fatal(`Docker must be installed: ${link}`)
  }
  try {
    await exec('docker ps')
  } catch {
    throw fatal('Docker must be running')
  }
}

async function startFauna(config: OpleConfig) {
  const name = 'faunadb.' + config.serverId
  const containerId = await getContainerId(name)
  if (!containerId) {
    await killContainersByPort([8443, 8084])

    const cachePath = path.resolve('.faunadb')
    const ramLimit = config.faunaMemoryLimit

    log('faunadb', log.gray('starting...'))
    await exec(
      `docker run -d --rm
      --name "${name}"
      ${ramLimit ? `--memory="${ramLimit}"` : ''}
      -v ${cachePath}:/var/lib/faunadb
      -v ${cachePath}/log:/var/log/faunadb
      -p 8443:8443
      -p 8084:8084
      fauna/faunadb:2.12.2
      --init`
    )
  }
  log('faunadb', italic(log.yellow('is running')))
}

const configDir = path.resolve('.pushpin')
const routesFile = path.resolve(configDir, 'routes')
const pushpinConf = path.resolve(configDir, 'pushpin.conf')

async function startPushpin(config: OpleConfig) {
  const name = 'pushpin.' + config.serverId
  const containerId = await getContainerId(name)
  if (!containerId) {
    await killContainersByPort([7999, 5560])

    fs.mkdir(configDir)
    fs.write(routesFile, `* host.docker.internal:${config.port},over_http`)

    if (!fs.exists(pushpinConf)) {
      const sigKey = config.gripSig || (config.gripSig = createUid())
      const contents = fs.read(path.resolve(__dirname, '../pushpin.conf'))
      fs.write(pushpinConf, contents.replace('changeme', sigKey))
    }

    log('pushpin', log.gray('starting...'))
    await exec(
      `docker run -d --rm
      --name "${name}"
      -v ${configDir}:/etc/pushpin/
      -p 7999:7999
      -p 5560-5563:5560-5563
      fanout/pushpin:1.30.0`
    )
  }
  if (!config.gripSig) {
    config.gripSig = readGripSig(pushpinConf)
  }
  log('pushpin', italic(log.yellow('is running')))
}

function getContainerId(name: string) {
  return exec(`docker ps -q -f name="${name}"`)
}

async function findContainerByPort(port: number) {
  return exec(`docker ps -q -f expose="${port}"`)
}

async function killContainersByPort(ports: number[]) {
  for (const port of ports) {
    const containerId = await findContainerByPort(port)
    if (containerId) {
      // TODO: use enquirer to ask if allowed to remove
      log('docker rm', log.yellow(containerId))
      await exec(`docker rm -f ${containerId}`)
    }
  }
}

function readGripSig(pushpinConf: string) {
  const content = fs.read(pushpinConf)
  const match = /\s+sig_key=([^\n]+)/.exec(content)
  if (!match) {
    throw Error('Missing "proxy.sig_key" in pushpin.conf')
  }
  return match[1]
}

function fatal(reason: string) {
  log(log.red('[!]'), reason)
  process.exit(1)
}
