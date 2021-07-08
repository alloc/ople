import { OpleDate, OpleRef, OpleTime } from '../values'

type DataReviver = (data: any) => any
const dataRevivers: [string, DataReviver][] = [
  ['@ref', toRef],
  ['@time', toTime],
  ['@date', toDate],
  ['@set', toSet],
]

export function jsonReviver(_key: string, value: any) {
  if (value == null || typeof value != 'object') {
    return value
  }
  for (const [key, revive] of dataRevivers) {
    const data = value[key]
    if (data) {
      return revive(data)
    }
  }
  return value
}

const nativeRefs: { [name: string]: OpleRef } = {
  collections: new OpleRef('collections'),
}

function toRef({ id, collection }: { id: string; collection?: any }): OpleRef {
  if (collection) {
    if (collection['@ref']) {
      return new OpleRef(id, toRef(collection['@ref']))
    }
    throw Error('Malformed ref')
  }
  const ref = nativeRefs[id]
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
  throw Error('not implemented')
}
