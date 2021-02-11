// import path from 'path'
// import launch from 'smart-restart'
// import debounce from 'debounce'
// import { watch } from 'chokidar'
// import { ClientBuilder } from '../generate/client'
// import { QueryScanner } from '../generate/queries'
// import exec from '@cush/exec'
// import {
//   relativeToHome,
//   PackageJson,
//   relativeToCwd,
//   getCommandPath,
// } from '../common'
// import { startFauna } from '../fauna/start'
// import { startPushpin } from '../pushpin/start'
// import { app, log, fatal, checkDocker } from './app'

// interface Flags {
//   port?: number
//   debug?: boolean
// }

// app
//   .command('start', 'Start the dev server')
//   .option('--port,-p [port]', 'The server port')
//   .option('--debug', 'Debug the server')
//   .action(async ({ port, debug }: Flags) => {
//     await checkDocker()

//     const pkgPath = path.resolve('package.json')
//     log('using', log.lgreen(relativeToHome(pkgPath)))

//     const pkg: PackageJson = require(pkgPath)
//     const config = pkg.ople
//     if (!config?.serverId) {
//       throw fatal('missing "ople.serverId" field in package.json')
//     }

//     config.port = port || config.port || 8000

//     // generateQueries(config)
//     // generateClient(config)

//     await startFauna(config)
//     await startPushpin(config, log)

//     launch({
//       main: path.resolve(pkg.main),
//       command: require.resolve('sucrase/bin/sucrase-node'),
//       spawnOptions: {
//         env: {
//           PATH: process.env.PATH,
//           PORT: '' + config.port,
//           GRIP_SIG: config.gripSig,
//           FORCE_COLOR: '1',
//           NODE_OPTIONS: getNodeOptions(debug),
//         },
//       },
//     })
//   })

// function getNodeOptions(debug?: boolean) {
//   let opts = `-r ${require.resolve('source-map-support/register')}`
//   if (debug) opts += ' --inspect'
//   return opts
// }

// // function generateClient(config: OpleConfig) {
// //   const clientPath = config.clientModuleId
// //   const schema = new ClientBuilder({
// //     cwd: process.cwd(),
// //     path: path.resolve(clientPath + '.d.ts'),
// //     clientExportId: config.clientExportId,
// //   })

// //   const schemaWatcher = watch([], {})

// //   const rebuild = debounce(() => {
// //     const watchPaths = Array.from(schema.watchPaths)

// //     log(log.gray('building client...'))
// //     const schemaFile = schema.build()

// //     // Save asynchronously.
// //     schemaFile
// //       .save()
// //       .then(files =>
// //         files.forEach(file => {
// //           log('saved', log.lgreen(relativeToCwd(file.getFilePath())))
// //         })
// //       )
// //       .catch(console.error)

// //     // Find old paths to stop watching.
// //     watchPaths.forEach(watchedPath => {
// //       if (!schema.watchPaths.has(watchedPath)) {
// //         schemaWatcher.unwatch(watchedPath)
// //       }
// //     })

// //     // Find new paths to watch.
// //     schema.watchPaths.forEach(watchPath => {
// //       if (!watchPaths.includes(watchPath)) {
// //         schemaWatcher.add(watchPath)
// //       }
// //     })
// //   }, 200)

// //   schemaWatcher.on('change', filePath => {
// //     const file = schema.project.getSourceFile(filePath)
// //     if (file && file.refreshFromFileSystemSync()) {
// //       rebuild()
// //     }
// //   })

// //   rebuild()
// // }

// // function generateQueries(config: OpleConfig) {
// //   const scanner = new QueryScanner({
// //     cwd: process.cwd(),
// //     outDir: config.queriesRoot,
// //   })

// //   const watcher = watch([], {})
// //   const rebuild = debounce(() => {
// //     const watchedPaths = Array.from(scanner.watchPaths)

// //     log(log.gray('building queries...'))
// //     const queriesModules = scanner.build()

// //     // Save asynchronously.
// //     Promise.all(
// //       queriesModules.map(file =>
// //         file
// //           .save()
// //           .then(() =>
// //             log('saved', log.lgreen(relativeToCwd(file.getFilePath())))
// //           )
// //       )
// //     ).catch(console.error)

// //     // Find old paths to stop watching.
// //     watchedPaths.forEach(watchedPath => {
// //       if (!scanner.watchPaths.has(watchedPath)) {
// //         watcher.unwatch(watchedPath)
// //       }
// //     })

// //     // Find new paths to watch.
// //     scanner.watchPaths.forEach(watchPath => {
// //       if (!watchedPaths.includes(watchPath)) {
// //         watcher.add(watchPath)
// //       }
// //     })
// //   }, 200)

// //   watcher.on('change', filePath => {
// //     const file = scanner.project.getSourceFile(filePath)
// //     if (file) {
// //       file.refreshFromFileSystemSync()
// //       rebuild()
// //     }
// //   })

// //   rebuild()
// // }
