import { v4 as uuid } from '@lukeed/uuid'
// import Timestamp from 'timestamp-nano'
import { CollectionHandle, db, Snapshot, Transaction } from './src/db'
import { merge } from './src/merge'
import {
  isReading,
  isWriting,
  kTransaction,
  snapshots,
  transactions,
} from './src/query'
import { now } from './src/time'

export { read, write } from './src/query'

export class OpleRef {
  constructor(readonly collection: string, readonly id: string) {}
}

export class OpleDate {}
export class OpleTime {
  constructor(readonly time: number) {}
}

const kHandle = Symbol('handle')

export class OpleCollection<T = any> {
  protected [kHandle]: CollectionHandle
  protected [kTransaction]: Snapshot | Transaction | null = null

  constructor(readonly name: string) {
    this[kHandle] = db.createCollection(name)
  }

  protected get reader() {
    if (!isReading()) {
      throw Error('Invalid outside "read" or "write" callback')
    }
    if (!this[kTransaction]) {
      snapshots.set(
        this,
        (this[kTransaction] = isWriting()
          ? this[kHandle].beginTransaction()
          : this[kHandle].beginSnapshot()),
      )
    }
    return this[kTransaction] as Snapshot
  }

  protected get writer() {
    if (!isWriting()) {
      throw Error('Invalid outside "write" callback')
    }
    if (!this[kTransaction]) {
      transactions.set(
        this,
        (this[kTransaction] = this[kHandle].beginTransaction()),
      )
    }
    return this[kTransaction] as Transaction
  }

  protected toDocument<T>(id: string, data: T, ts: number): OpleDocument<T> {
    return {
      ref: new OpleRef(this.name, id),
      data,
      ts: new OpleTime(ts),
    }
  }

  get(id: string) {
    return this.reader.get(id)
  }

  create(
    data: T,
    // TODO: use these options
    opts?: OpleDocumentOptions,
  ): OpleDocument<T> {
    const ts = now()
    const id = uuid()
    this.writer.put(id, { ...data, '@ts': ts })
    return this.toDocument(id, data, ts)
  }

  replace(id: string, data: T): OpleDocument<T> {
    if (!this.writer.exists(id)) {
      throw Error('Document does not exist: ' + id)
    }
    const ts = now()
    this.writer.put(id, { ...data, '@ts': ts })
    return this.toDocument(id, data, ts)
  }

  update(id: string, data?: T, opts?: OpleDocumentOptions): OpleDocument<T>
  update(
    id: string,
    data: null,
    opts?: OpleDocumentOptions,
  ): Omit<OpleDocument<T>, 'data'>
  update(
    id: string,
    data?: T | null,
    // TODO: use these options
    opts?: OpleDocumentOptions,
  ) {
    const ts = now()
    if (data === null) {
      if (!this.writer.exists(id)) {
        throw Error('Document does not exist: ' + id)
      }
      // TODO: set data to null
    } else if (data) {
      const oldData = this.writer.get(id)
      if (!oldData) {
        throw Error('Document does not exist: ' + id)
      }
      data = merge(oldData, data)
      this.writer.update(id, { ...data, '@ts': ts })
      return this.toDocument(id, data, ts)
    }
    throw Error('todo')
  }
}

export interface OpleDocumentOptions {
  credentials?: object
  delegates?: object
  ttl?: string | OpleTime
}

export interface OpleDocument<T = any> {
  ref: OpleRef
  data: Readonly<T>
  ts: OpleTime
}
