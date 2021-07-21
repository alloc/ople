import createServer, { ServerOptions } from 'create-server'
import { createHandler, MethodContext } from './handler'
import type { Methods } from './handler'
import { log } from './log'

export { MethodContext }
export type { Methods }

export interface OpleDataProvider {}

export interface OpleServiceConfig {
  dataProvider?: OpleDataProvider
}

/** Backend request handler */
export class OpleService {
  dataProvider?: OpleDataProvider
  constructor(config: OpleServiceConfig) {
    this.dataProvider = config.dataProvider
  }
}

// const actions: Methods = Object.create(null)

// export const api = {
//   /** Extend the server with more actions. */
//   extend(newActions: Methods) {
//     for (const key in newActions) {
//       if (actions[key]) {
//         throw Error(`Cannot redefine action: "${key}"`)
//       }
//       actions[key] = newActions[key]
//     }
//   },
//   /** Create a server. Servers are memoized by port. */
//   serve(opts: ServerOptions = {}) {
//     if (opts.port == null && process.env.PORT) {
//       opts.port = Number(process.env.PORT)
//     }
//     const server = createServer(opts, {
//       request: createHandler(actions),
//       error: log.error,
//       listening(error) {
//         if (error) {
//           log.error(error)
//         } else {
//           log('listening', log.lcyan(server.url))
//         }
//       },
//     })
//     return server
//   },
// }
