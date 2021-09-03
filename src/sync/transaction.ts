import { db, Snapshot, Transaction } from '../internal/db'
import { FromQuery } from '../convert'
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
export function read<T>(reader: () => T): FromQuery<T> {
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

/**
 * Write to the database.
 */
export function write<T>(
  writer: (abort: (message?: string) => never) => T,
): FromQuery<T> | undefined {
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
