import { Ref } from 'fauna-lite'
import { Batch } from './batch'
import { Client } from './client'
import { $R } from './symbols'

/** Refs are owned by a single client */
export const clientByRef = new WeakMap<Ref, PrivateClient>()

export interface PrivateClient extends Client, Batch {}

Ref.prototype.toString = function () {
  return encodeRef(this)
}

export const getRef = (arg: Ref | { [$R]?: Ref }) =>
  arg instanceof Ref ? arg : arg[$R] || null

export const getRefs = (args: object[]) =>
  args.map(getRef).filter(Boolean) as Ref[]

export function encodeRef({ id, collection, database }: Ref) {
  return (
    (database ? database.id : '') +
    '/' +
    (collection ? collection.id + '/' + id : id)
  )
}

export function decodeRef(ref: string) {
  let [db, coll, id] = ref.split('/')
  if (!id) {
    if (coll) [id, coll] = [coll, '']
    else if (db) [id, db] = [db, '']
  }
  return new Ref(
    id,
    coll
      ? Ref.Native[coll] || new Ref(coll, Ref.Native.collections)
      : undefined,
    db ? new Ref(db, Ref.Native.databases) : undefined
  )
}
