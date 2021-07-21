import type { Plugin } from 'vite'
import * as pushpin from 'pushpin-mock'
import { handleRequest } from '@ople/backend'

const URL_PREFIX = '/@ople-dev'

// TODO: generate frontend<>backend glue
// TODO: transform Ople/Record subclasses in frontend code
export function opleDevServer(): Plugin {
  return {
    name: 'ople:dev-server',
    configureServer(server) {
      pushpin.createServer({
        path: URL_PREFIX,
        server,
      })
      server.middlewares.use((req, res, next) => {
        const { url } = req
        if (url && url.startsWith(URL_PREFIX)) {
          if (req.method !== 'POST') {
            res.statusCode = 405
            return res.end()
          }
          req.url = url.slice(URL_PREFIX.length) || '/'
          handleRequest(req, res, next)
        } else {
          next()
        }
      })
    },
  }
}
