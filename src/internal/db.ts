import bindings from 'bindings'
import path from 'path'
import { OpleDocument, OpleRef } from '../values'

const pwd = process.cwd()
process.chdir(process.env.HOME + '/.nimble/pkgs/nimdbx-0.4.1/libmdbx-dist')
export const db: DatabaseHandle = bindings('ople')
process.chdir(pwd)

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

export interface DatabaseHandle {
  open(path: string): void
  /** Start an isolated read transaction */
  beginSnapshot(): Snapshot
  /** Start an isolated write transaction */
  beginTransaction(): Transaction
  /**
   * Find a document by iterating a collection.
   *
   * The `filter` function receives a document in JSON format.
   * The result is the first document for which `filter` returns true.
   */
  findDocument(collection: string, filter: (doc: string) => boolean): string
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
