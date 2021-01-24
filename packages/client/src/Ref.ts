import { Ref } from 'fauna-lite'
import { Batch } from './batch'
import { Client } from './client'
import { $R } from './symbols'

/** Refs belong to one collection */
export const collectionByRef = new WeakMap<Ref, PrivateClient>()

export const getRef = (arg: Ref | { [$R]?: Ref }) =>
  arg instanceof Ref ? arg : arg[$R] || null

export const getRefs = (args: object[]) =>
  args.map(getRef).filter(Boolean) as Ref[]
