import { notImplemented } from '../errors'
import { merge } from '../merge'
import { OpleDocument, OpleDocumentOptions } from './document'
import { OpleRef } from '../values'
import { execSync, q } from './transaction'

export interface OpleCollectionOptions {
  data?: any
  history_days?: number
  permissions?: any
  ttl_days?: number
}

export class OpleCollection<T = any> {
  private ref: OpleRef

  /**
   * Equivalent to `Collection` in FaunaDB
   *
   * @see https://docs.fauna.com/fauna/current/api/fql/functions/collection
   */
  constructor(readonly name: string) {
    this.ref = new OpleRef(name, OpleRef.Native.collections)
  }

  /** Get the mutable metadata of this collection */
  get data(): any {
    throw notImplemented
  }

  /** Read a document in this collection */
  get(id: string) {
    return execSync('get', new OpleRef(id, this.ref))
  }

  /** Create a document in this collection */
  create(
    data: T,
    // TODO: use these options
    opts?: OpleDocumentOptions,
  ): OpleDocument<T> {
    return execSync('create')
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
