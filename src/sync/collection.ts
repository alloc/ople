import { notImplemented } from '../errors'
import {
  OpleFrozenDocument as OpleDocument,
  OpleDocumentOptions,
} from './document'
import { OpleRef } from '../values'
import { OpleSet } from './set'
import { q } from './transaction'
import { db } from '../internal/db'
import { jsonReviver } from '../json/reviver'

function coerceToRef<T extends object | null = any>(
  ref: string | OpleRef<T>,
  collection: OpleRef,
): OpleRef<T> {
  if (typeof ref == 'string') {
    return new OpleRef(ref, collection)
  }
  if (ref.collection?.id !== collection.id) {
    throw Error('Document ref belongs to another collection')
  }
  return ref
}

export class OpleCollection<
  T extends object | null = any,
  Meta extends object | null = any,
> {
  private _ref: OpleRef

  /**
   * Equivalent to `Collection` in FaunaDB
   *
   * @see https://docs.fauna.com/fauna/current/api/fql/functions/collection
   */
  constructor(readonly name: string) {
    this._ref = new OpleRef(name, OpleRef.Native.collections)
  }

  /** Get the mutable metadata of this collection */
  get data(): Meta {
    throw notImplemented
  }

  /** Check if this collection exists */
  get exists() {
    return q.exists(this._ref)
  }

  /** Get the document refs in this collection */
  get refs() {
    return new OpleSet<OpleRef<T>>({ documents: this._ref })
  }

  /** Read the documents in this collection */
  get documents() {
    return new OpleSet<OpleDocument<T>>({ get_documents: this._ref })
  }

  /** Create a document ref, whose document may or may not exist */
  ref(id: string) {
    return new OpleRef<T>(id, this._ref)
  }

  /** Read a document in this collection */
  get(id: string) {
    return q.get(new OpleRef<T>(id, this._ref))
  }

  /**
   * Find a document by iterating over the entire collection.
   *
   * ⚠️ This is very inefficient on large collections, compared
   * to an indexed search.
   */
  find(filter: (doc: OpleDocument<T>) => boolean) {
    return db.findDocument(this._ref.id, docStr => {
      const doc = JSON.parse(docStr, jsonReviver)
      return filter(doc)
    })
  }

  /** Create a document in this collection */
  create(data: T, options?: OpleDocumentOptions): OpleDocument<T> {
    return q.create(this._ref, { ...options, data })
  }

  /** Replace a document's data */
  replace(ref: string | OpleRef<T>, data: T): OpleDocument<T> {
    return q.replace(coerceToRef(ref, this._ref), { data })
  }

  /** Merge new data into a document */
  update(
    ref: string | OpleRef<T>,
    options: { data?: Partial<T> } & OpleDocumentOptions,
  ): OpleDocument<T> {
    return q.update(coerceToRef(ref, this._ref), options)
  }
}

export interface OpleCollection<T> {}

export namespace OpleCollection {
  /** The options for `Database#createCollection` */
  export interface Options<T extends object | null> {
    data?: T
    history_days?: number
    permissions?: any
    ttl_days?: number
  }

  /** The result of `Database#createCollection` */
  export interface CreateResult<T extends object | null> {
    ref: OpleRef<T>
    name: string
    ts: number
    history_days: number | null
  }
}
