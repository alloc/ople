import { OpleConfig, OpleEnv, BackendClient, DatabaseClient } from './types'

declare const ople: {
  config: OpleConfig
  env: OpleEnv
}

const config = (ople.config = {
  collections: new Set(),
  clients: {
    backend: {
      backendPath: './backend',
      outPath: './app/client.ts',
    },
    database: {
      outPath: './backend/db.ts',
    },
  },
})

declare global {
  const setEnv: typeof api.setEnv
  const openCollection: typeof api.openCollection
  const emitBackendClient: typeof api.emitBackendClient
  const emitDatabaseClient: typeof api.emitDatabaseClient
}

const api = {
  setEnv(env: OpleEnv) {
    ople.env = env
  },
  openCollection(name: string) {
    config.collections.add(name)
  },
  emitBackendClient(options: Partial<BackendClient>) {
    Object.assign(config.clients.backend, options)
  },
  emitDatabaseClient(options: Partial<DatabaseClient>) {
    Object.assign(config.clients.database, options)
  },
}

declare const global: any
Object.assign(global, api)

export default api
