import { Ref } from 'fauna-lite'
import { Collection } from './Collection'

/** Refs belong to one collection */
export const collectionByRef = new WeakMap<Ref, Collection>()
