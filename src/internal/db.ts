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
  /** Execute a query, which blocks the thread until it completes */
  execSync(query: string, callbacks?: Record<string, Function>): string
  /** Release memory */
  finish(): void
}

export interface Transaction extends Snapshot {
  /** Save changes */
  commit(): void
}
