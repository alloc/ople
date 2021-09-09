import { OpleRef } from '../values'
import { OpleCollection, OpleDocument } from './types'
import { q } from './transaction'
import { OpleInput } from '../convert'
import { OpleSet } from './set'

// These collection names are reserved by FaunaDB.
const reservedCollectionNames = ['events', 'set', 'self', 'documents', '_']

export const db: OpleDatabase = {
  ref: (id: string, collection: any) =>
    new OpleRef(id, new OpleRef(collection, OpleRef.Native.collections)),
  get: q.get,
  getCollections: () => new OpleSet({ collections: null }),
  getCollection: (name: string) => new OpleCollection(name),
  hasCollection: name =>
    q.exists(new OpleRef(name, OpleRef.Native.collections)),
  createCollection(name, options) {
    if (reservedCollectionNames.includes(name)) {
      throw Error(`Collection cannot be named "{name}"`)
    }
    return q.createCollection({ ...options, name })
  },
  replace: (ref, data) => q.replace(ref, { data }),
  update: q.update,
}

export interface OpleDatabase {
  /** Create a document ref, whose document may not exist. */
  ref<Collection extends keyof OpleDocuments>(
    id: string,
    collection: Collection,
  ): OpleRef<OpleDocuments[Collection]>
  ref<T extends object = any>(id: string, collection: string): OpleRef<T>

  get: typeof q.get

  getCollections(): OpleSet<OpleRef>

  /** Get a collection that was created statically. */
  getCollection<Name extends keyof OpleDocuments>(
    name: Name,
  ): OpleCollection<OpleDocuments[Name], Name>

  /** Get a collection that was created dynamically. */
  getCollection(name: string): OpleCollection

  /** Check if a collection exists. */
  hasCollection(name: string): boolean

  createCollection<T extends object | null = any>(
    name: string,
    options?: OpleCollection.Options<T>,
  ): OpleCollection.CreateResult<T>

  /** Replace a document's data */
  replace<T extends object | null>(ref: OpleRef<T>, data: T): OpleDocument<T>

  /** Merge new data into a document */
  update<T extends object | null>(
    ref: OpleRef<T>,
    options: { data?: OpleInput<Partial<T>> } & OpleDocument.Options,
  ): OpleDocument<T>
}

/**
 * Document type of each collection.
 *
 * ---
 * Use "interface merging" to statically type your documents:
 *
 *     declare module 'ople-db' {
 *       export interface OpleDocuments {
 *         users: { name: string, phone: string, age: number }
 *       }
 *     }
 *
 * Now, the IDE will warn you of typos and invalid data when
 * using `db.getCollection("users").create(...)`
 */
export interface OpleDocuments {}

/**
 * Metadata of each collection.
 *
 * ---
 * Use "interface merging" to statically type your collections:
 *
 *     declare module 'ople-db' {
 *       export interface OpleCollections {
 *         users: { something: string }
 *       }
 *     }
 *
 * Now, the IDE will warn you of typos and invalid data when using:
 *
 *     db.getCollection("users").data
 */
export interface OpleCollections {}
