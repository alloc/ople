import type { OpleCollection } from '../ople'
import { Snapshot, Transaction } from './db'

export const kTransaction = Symbol('transaction')

export const snapshots = new Map<OpleCollection, Snapshot>()
export const transactions = new Map<OpleCollection, Transaction>()

const READ = 1
const WRITE = 2

let flags = 0

export function isReading() {
  return Boolean(flags & (READ | WRITE))
}

export function isWriting() {
  return Boolean(flags & WRITE)
}

/**
 * Read from the database.
 */
export function read<T>(reader: () => T): T {
  if (flags) {
    throw Error('Nested transactions are forbidden')
  }
  flags |= READ
  try {
    return reader()
  } finally {
    flags ^= READ
    flush(snapshots, (snapshot, coll) => {
      coll[kTransaction] = null
      snapshot.finish()
    })
  }
}

/**
 * Write to the database.
 */
export function write(writer: (rollback: () => void) => void): void {
  if (flags) {
    throw Error('Nested transactions are forbidden')
  }
  flags |= WRITE
  let didWrite = false
  try {
    let willWrite = true
    writer(() => {
      willWrite = false
    })
    if (willWrite) {
      didWrite = true
      flush(transactions, (transaction, coll) => {
        coll[kTransaction] = null
        // TODO: is it significantly faster to call `finish` instead
        //       if only reads were performed?
        transaction.commit()
      })
    }
  } finally {
    flags ^= WRITE
    if (!didWrite) {
      flush(transactions, (transaction, coll) => {
        coll[kTransaction] = null
        transaction.finish()
      })
    }
  }
}

function flush<K, V>(map: Map<K, V>, iter: (value: V, key: K) => void) {
  map.forEach(iter)
  map.clear()
}

type Query = object

/**
 * Reads are compiled into `readAsync` calls in production.
 */
export function readAsync(query: Query, ...params: any[]): Promise<any> {
  // TODO
}

/**
 * Writes are compiled into `writeAsync` calls in production.
 */
export function writeAsync(query: Query, ...params: any[]): Promise<void> {
  // TODO
}
