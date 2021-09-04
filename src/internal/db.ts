import bindings from 'bindings'
import path from 'path'

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
}

export interface Snapshot {
  /**
   * Find a document by iterating a collection.
   *
   * The `filter` function receives a document in JSON format.
   * The result is the first document for which `filter` returns true.
   */
  findDocument(collection: string, filter: (doc: string) => boolean): string
  /**
   * Find documents by iterating a collection.
   *
   * The `params` string should be a JSON object of pagination options.
   * The `filter` function receives a document in JSON format.
   * The result is a page of documents for which `filter` returns true.
   */
  filterDocuments(
    collection: string,
    params: string,
    filter: (doc: string) => boolean,
  ): string
  /** Execute a query and stall the thread until it completes */
  execSync(query: string): string
  /** Release memory */
  finish(): void
}

export interface Transaction extends Snapshot {
  /** Save changes */
  commit(): void
}
