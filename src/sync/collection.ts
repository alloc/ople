import { notImplemented } from '../errors'
import { merge } from '../merge'
import { OpleDocument, OpleDocumentOptions } from './document'
import { OpleRef } from '../values'
import { execSync, q } from './transaction'

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

export class OpleCollection<T extends object | null = any> {
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
  create(data: T, options?: OpleDocumentOptions): OpleDocument<T> {
    return q.create(this.ref, { ...options, data })
  }

  /** Replace a document's data */
  replace(ref: string | OpleRef<T>, data: T): OpleDocument<T> {
    return q.replace(coerceToRef(ref, this.ref), { data })
  }

  /** Merge new data into a document */
  update(
    ref: string | OpleRef<T>,
    options: { data?: Partial<T> } & OpleDocumentOptions,
  ): OpleDocument<T> {
    return q.update(coerceToRef(ref, this.ref), options)
  }
}

export interface OpleCollection<T> {}

export namespace OpleCollection {
  /** The options for `Database#createCollection` */
  export interface Options<T extends object> {
    data?: T
    history_days?: number
    permissions?: any
    ttl_days?: number
  }

  /** The result of `Database#createCollection` */
  export interface CreateResult<T extends object> {
    ref: OpleRef<T>
    name: string
    ts: number
    history_days: number | null
  }
}
