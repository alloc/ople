import { db, Snapshot, Transaction } from '../db'
import { writeQueries } from '../queryMap'
import { makeQuery } from '../query'

let snapshot: Snapshot | null = null
let transaction: Transaction | null = null

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
export function read<T>(reader: () => T): T {
  if (snapshot || transaction) {
    throw Error('Nested transactions are forbidden')
  }
  snapshot = db.beginSnapshot()
  try {
    return reader()
  } finally {
    snapshot.finish()
    snapshot = null
  }
}

/**
 * Write to the database.
 */
export function write(writer: (rollback: () => void) => void): void {
  if (snapshot || transaction) {
    throw Error('Nested transactions are forbidden')
  }
  let didCommit = false
  transaction = db.beginTransaction()
  try {
    let willCommit = true
    writer(() => {
      willCommit = false
    })
    if (willCommit) {
      transaction.commit()
      didCommit = true
    }
  } finally {
    didCommit || transaction.finish()
    transaction = null
  }
}
