import { OpleInput, OpleResult } from '../convert'
import { OpleRef } from '../values'
import { wrapCallback } from './callback'
import { OpleCollections } from './database'
import { OplePagination, OpleRefSet, OpleSet } from './set'
import { q } from './transaction'
import type { Collator, OpleDocument, OplePage } from './types'

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

type CollectionMeta<Name> = Name extends keyof OpleCollections
  ? OpleCollections[Name] & object
  : any

export class OpleCollection<
  T extends object | null = any,
  Name extends string = string,
> {
  private _ref: OpleRef<CollectionMeta<Name>>

  /**
   * Equivalent to `Collection` in FaunaDB
   *
   * @see https://docs.fauna.com/fauna/current/api/fql/functions/collection
   */
  constructor(readonly name: Name) {
    this._ref = new OpleRef(name, OpleRef.Native.collections)
  }

  /** Get the metadata of this collection */
  get data(): OpleResult<CollectionMeta<Name>> {
    return q.get(this._ref).data
  }

  /** Check if this collection exists */
  get exists() {
    return q.exists(this._ref)
  }

  /** Get the document refs in this collection */
  get refs() {
    return new OpleRefSet<T>({ documents: this._ref })
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
   * ⚠︎ This can be very inefficient on large collections, compared
   * to an indexed search.
   */
  find(filter: (doc: OpleDocument<T>) => boolean): OpleDocument<T> | null {
    return q.get(this.filter(filter))
  }

  /**
   * Filter a collection by iterating its documents.
   *
   * If you pass an `OplePagination` object, the results will
   * be paginated immediately.
   *
   * ⚠︎ This can be very inefficient on large collections, compared
   * to an indexed search.
   */
  filter(filter: (doc: OpleDocument<T>) => boolean): OpleSet<OpleDocument<T>>

  filter(
    filter: (doc: OpleDocument<T>) => boolean,
    params: OplePagination,
  ): OplePage<OpleDocument<T>>

  filter(filter: (doc: OpleDocument<T>) => boolean, params?: OplePagination) {
    const set = this.documents.filter(filter)
    return params ? set.paginate(params) : set
  }

  sortBy(collator: Collator) {
    return new OpleRefSet<T>({
      indexed_refs: this._ref,
      collator: collator.id,
      collate: wrapCallback(collator.collate),
    })
  }

  /** Create a document in this collection */
  create(data: T, options?: OpleDocument.Options) {
    return q.create(this._ref, { ...options, data })
  }

  /** Replace a document's data */
  replace(ref: string | OpleRef<T>, data: T) {
    return q.replace(coerceToRef(ref, this._ref), { data })
  }

  /** Merge new data into a document */
  update(
    ref: string | OpleRef<T>,
    options: { data?: OpleInput<Partial<T>> } & OpleDocument.Options,
  ) {
    return q.update(coerceToRef(ref, this._ref), options)
  }

  /** Delete the collection and its documents. */
  delete() {
    return q.delete(this._ref)
  }

  // createIndex(name: string, toSortKey: (data: T) => Collatable | Collatable[]) {
  //   q.createIndex({
  //     name,
  //     source: this._ref,
  //     collate: wrapCallback(toSortKey),
  //   })
  // }
}

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
