import { OpleRef } from '../values'
import { OpleCollection } from './collection'
import { q } from './transaction'

// These collection names are reserved by FaunaDB.
const reservedCollectionNames = ['events', 'set', 'self', 'documents', '_']

export const db: OpleDatabase = {
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

export interface OpleDatabase<
  Collections extends Record<string, object> = Record<string, any>,
> {
  get: typeof q.get

  /** Get a collection that was created statically. */
  getCollection<Name extends keyof Collections>(
    name: Name,
  ): OpleCollection<Collections[Name]>

  /** Get a collection that was created dynamically. */
  getCollection(name: string): OpleCollection

  /** Check if a collection exists. */
  hasCollection(name: string): boolean

  createCollection<T extends object | null = any>(
    name: string,
    options?: OpleCollection.Options<T>,
  ): OpleCollection.CreateResult<T>
}
