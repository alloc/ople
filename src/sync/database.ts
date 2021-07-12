import { OpleRef } from '../values'
import { OpleCollection } from './collection'
import { q } from './transaction'

// These collection names are reserved by FaunaDB.
const reservedCollectionNames = ['events', 'set', 'self', 'documents', '_']

export const db: OpleDatabase = {
  get: q.get,
  getCollection: name => new OpleCollection(name),
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
  get: typeof q.get
  getCollection<T extends object | null = any>(name: string): OpleCollection<T>
  hasCollection(name: string): boolean
  createCollection<T extends object | null = any>(
    name: string,
    options?: OpleCollection.Options<T>,
  ): OpleCollection.CreateResult<T>
}
