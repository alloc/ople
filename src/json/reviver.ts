import { OpleQueryError } from '../errors'
import { OpleArray } from '../sync/array'
import { OpleDocument, isDocumentLike } from '../sync/document'
import { OpleSet } from '../sync/set'
import { OpleDate, OpleRef, OpleTime } from '../values'

type DataReviver = (data: any) => any
const dataRevivers: [string, DataReviver][] = [
  ['@ref', toRef],
  ['@time', toTime],
  ['@date', toDate],
  ['@set', toSet],
  ['@error', toError],
]

export function jsonReviver(_key: string, value: any) {
  if (value == null || typeof value != 'object') {
    return value
  }
  if (Array.isArray(value)) {
    return new OpleArray(value)
  }
  for (const [key, revive] of dataRevivers) {
    const data = value[key]
    if (data) {
      return revive(data)
    }
  }
  if (isDocumentLike(value)) {
    return new OpleDocument(value.ref, value.data, value.ts)
  }
  return value
}

function toRef({ id, collection }: { id: string; collection?: any }): OpleRef {
  if (collection) {
    return new OpleRef(id, collection)
  }
  const ref = (OpleRef.Native as any)[id]
  if (ref) {
    return ref
  }
  throw Error('Ref must have a collection')
}

function toTime(data: string) {
  return new OpleTime(data)
}

function toDate(data: string) {
  return new OpleDate(data)
}

function toSet(data: any) {
  return new OpleSet(data)
}

function toError({ code, description, position }: any) {
  return new OpleQueryError(code, description, position)
}
