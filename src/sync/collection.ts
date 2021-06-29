import { v4 as uuid } from '@lukeed/uuid'
// import Timestamp from 'timestamp-nano'
import { CollectionHandle, db, Snapshot, Transaction } from '../db'
import { notImplemented } from '../errors'
import { merge } from '../merge'
import {
  isReading,
  isWriting,
  kTransaction,
  snapshots,
  transactions,
} from '../transaction'
import { now } from '../time'
import { OpleDocument, OpleDocumentOptions } from './document'
import { OpleRef, OpleTime } from './values'

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

  /** Get the mutable metadata of this collection */
  get data(): any {
    throw notImplemented
  }

  /** Read a document in this collection */
  get(id: string) {
    return this.reader.get(id)
  }

  /** Create a document in this collection */
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

  /** Replace a document's data */
  replace(id: string, data: T): OpleDocument<T> {
    if (!this.writer.exists(id)) {
      throw Error('Document does not exist: ' + id)
    }
    const ts = now()
    this.writer.put(id, { ...data, '@ts': ts })
    return this.toDocument(id, data, ts)
  }

  /** Merge new data into a document */
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

export interface OpleCollection<T> {}
