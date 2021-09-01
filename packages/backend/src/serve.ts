import log from 'lodge'
import createServer, { ServerOptions } from 'create-server'
import { createMiddleware, MiddlewareConfig } from './middleware'

export interface ServeOptions extends ServerOptions, MiddlewareConfig {}

export function serve({ context, gripSecret, onError, ...opts }: ServeOptions) {
  const handleRequest = createMiddleware({
    context,
    gripSecret,
    onError,
  })

  return createServer(opts, {
    request(req, res) {
      handleRequest(req, res).catch(log.error)
    },
  })
}
