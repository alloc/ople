import { OpleRef } from '../values'
import { OpleCollection } from './collection'
import { q } from './transaction'

// These collection names are reserved by FaunaDB.
const reservedCollectionNames = ['events', 'set', 'self', 'documents', '_']

export const db: OpleDatabase = {
  ref: (id: string, collection: any) =>
    new OpleRef(id, new OpleRef(collection, OpleRef.Native.collections)),
  get: q.get,
  getCollection: (name: string) => new OpleCollection(name),
  hasCollection: name =>
    q.exists(new OpleRef(name, OpleRef.Native.collections)),
  createCollection(name, options) {
    if (reservedCollectionNames.includes(name)) {
      throw Error(`Collection cannot be named "{name}"`)
    }
    return q.createCollection({ ...options, name })
  },
}

export interface OpleDatabase {
  /** Create a document ref, whose document may not exist. */
  ref<Collection extends keyof OpleDocuments>(
    id: string,
    collection: Collection,
  ): OpleRef<OpleDocuments[Collection]>
  ref<T extends object = any>(id: string, collection: string): OpleRef<T>

  get: typeof q.get

  /** Get a collection that was created statically. */
  getCollection<Name extends keyof OpleDocuments>(
    name: Name,
  ): OpleCollection<OpleDocuments[Name], OpleCollections[Name]>

  /** Get a collection that was created dynamically. */
  getCollection(name: string): OpleCollection

  /** Check if a collection exists. */
  hasCollection(name: string): boolean

  createCollection<T extends object | null = any>(
    name: string,
    options?: OpleCollection.Options<T>,
  ): OpleCollection.CreateResult<T>
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
 * Now, the IDE will warn you of typos and invalid data when
 * using `db.getCollection("users").data`
 */
export interface OpleCollections {}
