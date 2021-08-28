import createServer, { ServerOptions } from 'create-server'
import { createMiddleware } from './middleware'
import { ServerContext } from './context'

export interface ServeOptions extends ServerOptions {
  context: ServerContext
}

export function serve({ context, ...opts }: ServeOptions) {
  return createServer(opts, {
    request: createMiddleware({
      context,
    }),
    error: console.error,
    listening(error) {
      if (error) {
        console.error(error)
      } else {
        console.log('Server started!')
      }
    },
  })
}
