import { db, Snapshot, Transaction } from '../db'
import type { OpleQuery } from '../query'

let snapshot: Snapshot | null = null
let transaction: Transaction | null = null

export function withSnapshot(query: OpleQuery) {
  const reader = snapshot || transaction
  if (!reader) {
    throw Error('Must be within `read` callback')
  }
  const result = reader.execSync(JSON.stringify(query))
}

export function withTransaction(query: OpleQuery) {
  if (!transaction) {
    throw Error('Must be within `write` callback')
  }
  const result = transaction.execSync(JSON.stringify(query))
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
