import { notImplemented } from '../errors'
import { OpleDocument, OpleDocumentOptions } from './document'
import { OpleRef } from '../values'
import { execSync, q } from './transaction'
import { OpleSet } from './set'

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

  /** Check if this collection exists */
  get exists() {
    return q.exists(this.ref)
  }

  /** Get the document refs in this collection */
  get refs() {
    return new OpleSet<OpleRef<T>>({ documents: this.ref })
  }

  /** Read the documents in this collection */
  get documents() {
    return new OpleSet<OpleDocument<T>>({ get_documents: this.ref })
  }

  /** Read a document in this collection */
  get(id: string) {
    return q.get(new OpleRef<T>(id, this.ref))
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
