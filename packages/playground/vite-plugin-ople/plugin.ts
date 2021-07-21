import * as vite from 'vite'
import * as pushpin from 'pushpin-mock'
import * from '@ople/backend'

export function opleDevServer(): vite.Plugin {
  return {
    name: 'ople:dev-server',
    configureServer(server) {
      pushpin.createServer({ server })
      server.middlewares.use((req, res, next) => {
        if (req.url !== '/@ople-dev') {
          return next()
        }
        if (req.method === 'POST') {
          req
        }
      })
    }
  }
}
