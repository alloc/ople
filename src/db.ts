import bindings from 'bindings'
import path from 'path'

export const db: Database = bindings('ople')
export const dbPath =
  process.env.NODE_ENV === 'test'
    ? require('tempy').file({ name: 'ople_data' })
    : path.resolve('ople_data')

db.open(dbPath)

declare global {
  export interface NodeRequire {
    (id: 'tempy'): typeof import('tempy')
  }
}

export interface Database {
  open(path: string): void
  /** Start an isolated read transaction */
  beginSnapshot(): Snapshot
  /** Start an isolated write transaction */
  beginTransaction(): Transaction
}

export interface Snapshot {
  /** Execute a query and stall the thread until it completes */
  execSync(query: string): string
  /** Release memory */
  finish(): void
}

export interface Transaction extends Snapshot {
  /** Save changes */
  commit(): void
}
