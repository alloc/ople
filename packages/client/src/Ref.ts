import { Ref } from 'fauna-lite'
import { Batch } from './batch'
import { Client } from './client'
import { $R } from './symbols'

/** Refs are owned by a single client */
export const clientByRef = new WeakMap<Ref, PrivateClient>()

export interface PrivateClient extends Client, Batch {}

export const getRef = (arg: Ref | { [$R]?: Ref }) =>
  arg instanceof Ref ? arg : arg[$R] || null

export const getRefs = (args: object[]) =>
  args.map(getRef).filter(Boolean) as Ref[]
