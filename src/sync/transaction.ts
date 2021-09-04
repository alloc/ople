import { Materialize } from '../convert'
import { db, Snapshot, Transaction } from '../internal/db'
import { makeQuery, OpleQueries } from '../query'
import { queryMap, writeQueries } from '../queryMap'
import { OpleArray } from './array'

let snapshot: Snapshot | null = null
let transaction: Transaction | null = null

/** Type-safe query functions */
export const q = new Proxy({} as OpleQueries, {
  get: (_, callee: string) =>
    queryMap[callee] ? execSync.bind(null, callee) : undefined,
})

export function withSnapshot<T>(cb: (snapshot: Snapshot) => T) {
  if (snapshot) {
    return cb(snapshot)
  }
  if (transaction) {
    return cb(transaction)
  }
  throw Error('Must be within `read` or `write` callback')
}

/** Untyped query executor */
export function execSync(callee: string, ...args: any[]) {
  const query = makeQuery(callee, ...args)
  if (transaction) {
    return query.execSync(transaction)
  }
  if (writeQueries.includes(callee)) {
    throw Error('Must be within `write` callback')
  }
  if (snapshot) {
    return query.execSync(snapshot)
  }
  throw Error('Must be within `read` or `write` callback')
}

/**
 * Read from the database.
 */
export function read<T>(reader: () => T): Materialize<T> {
  if (snapshot || transaction) {
    throw Error('Nested transactions are forbidden')
  }
  snapshot = db.beginSnapshot()
  try {
    return materialize(reader())
  } finally {
    snapshot.finish()
    snapshot = null
  }
}

type Writer<T> = (() => T) | ((abort: (message?: string) => never) => T)
type WriteResult<T, U extends Writer<T>> = U extends () => any
  ? Materialize<T>
  : Materialize<T> | undefined

/**
 * Write to the database.
 */
export function write<T, U extends Writer<T>>(
  writer: U | Writer<T>,
): WriteResult<T, U>
export function write(writer: (abort: (message?: string) => never) => any) {
  if (snapshot || transaction) {
    throw Error('Nested transactions are forbidden')
  }
  transaction = db.beginTransaction()
  try {
    const result = writer(() => {
      throw transaction
    })
    transaction.commit()
    return materialize(result)
  } catch (e) {
    transaction.finish()
    if (e !== transaction) {
      throw e
    }
  } finally {
    transaction = null
  }
}

function materialize(value: any): any {
  if (value) {
    if (Array.isArray(value)) {
      return value instanceof OpleArray
        ? [].map.call(value, materialize)
        : value.map(materialize)
    }
    if (value.constructor == Object) {
      for (const key in value) {
        value[key] = materialize(value[key])
      }
    }
  }
  return value
}
