declare global {
  interface OpleEnv {
    gripSecret: string
  }
  interface OpleConfig {
    collections: Set<string>
    clients: {
      backend: BackendClient
      database: DatabaseClient
    }
  }
}

export type BackendClient = {
  backendPath: string
  outPath: string
}

export type DatabaseClient = {
  outPath: string
}
