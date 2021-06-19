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
  createCollection(name: string): CollectionHandle
}

export interface CollectionHandle {
  /** Start an isolated read transaction */
  beginSnapshot(): Snapshot
  /** Start an isolated write transaction */
  beginTransaction(): Transaction
}

export type Data = Record<string, any>

export interface Snapshot {
  /** Lookup a row by its key */
  get(key: string): Data | null
  /** Check if a row exists by the given key */
  exists(key: string): boolean
  /** Release memory */
  finish(): void
}

export interface Transaction extends Snapshot {
  /** Create a row or overwrite existing row */
  put(key: string, value: Data): void
  /** Create a row if it doesn't exist */
  insert(key: string, value: Data): void
  /** Overwrite a row if it exists */
  update(key: string, value: Data): void
  /** Delete a row */
  del(key: string): boolean
  /** Save changes */
  commit(): void
}
