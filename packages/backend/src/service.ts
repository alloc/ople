import { IncomingHttpHeaders } from 'http'
import { defaultMethods } from './builtin'
import { services } from './handler'
import { Methods } from './method'

type AnyContext = { [key: string]: any }
type MetaHeaders = { [name: string]: string | undefined }

type Authorizer = (
  meta: MetaHeaders,
  headers: IncomingHttpHeaders,
  method: string
) => Promise<boolean> | boolean

type ContextFactory<T extends object> = (
  meta: MetaHeaders,
  method: string
) => Promise<T | null> | T | null

export interface OpleServiceConfig<Context extends object> {
  /** The request path for this service. */
  path: string
  /** Deny requests using their headers. */
  authorize?: Authorizer
  /** Load extra context for method calls. */
  getContext?: ContextFactory<Context>
}

export class OpleService<Context extends object = AnyContext> {
  protected getContext: ContextFactory<Context> | undefined

  readonly path: string
  readonly authorize: Authorizer
  readonly methods: Readonly<Methods<Context>> = Object.create(null)

  constructor(config: OpleServiceConfig<Context>) {
    this.path = config.path
    this.authorize = config.authorize || (() => true)
    this.getContext = config.getContext

    this.use(defaultMethods)
    services.add(this)
  }

  use(methods: Methods<Context>) {
    Object.assign(this.methods, methods)
  }

  async applyContext(out: any, meta: MetaHeaders, method: string) {
    if (this.getContext) {
      const ctx = await this.getContext(meta, method)
      ctx && Object.assign(out, ctx)
    }
  }

  /** Remove this service from the global handler. */
  close() {
    services.delete(this)
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
