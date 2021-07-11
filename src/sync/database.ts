import { OpleRef } from '../values'
import { OpleCollection, OpleCollectionOptions } from './collection'
import { OpleDocument, OpleDocumentOptions } from './document'
import { q } from './transaction'

// These collection names are reserved by FaunaDB.
const reservedCollectionNames = ['events', 'set', 'self', 'documents', '_']

export function newCollection(name: string, options?: OpleCollectionOptions) {
  if (reservedCollectionNames.includes(name)) {
    throw Error(`Collection cannot be named "{name}"`)
  }
  return q.createCollection({ ...options, name })
}

export const db: OpleDatabase = {
  get: q.get,
  getCollection,
}

export interface OpleDatabase {
  get(ref: OpleRef): OpleDocument

  create<T>(
    collection: OpleRef,
    params: { data: T } & OpleDocumentOptions,
  ): OpleDocument<T>

  createCollection<T>(
    params: { name: string } & OpleCollectionOptions,
  ): OpleCollection<T>

  getCollection<T>(name: string)
}
