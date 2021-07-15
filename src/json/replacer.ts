import { OpleSet } from '../sync/set'
import { OpleDate, OpleRef, OpleTime } from '../values'

export function jsonReplacer(key: string, value: any) {
  if (
    value == null ||
    typeof value != 'object' ||
    Array.isArray(value) ||
    key == '@ref' ||
    key == '@obj' ||
    key == ''
  ) {
    return value
  }
  switch (value.constructor) {
    case OpleRef:
      return replaceRef(value)
    case OpleTime:
      return replaceTime(value)
    case OpleDate:
      return replaceDate(value)
    case OpleSet:
      return replaceSet(value)
  }
  return { '@obj': value }
}

function replaceRef(ref: OpleRef) {
  const data: any = { id: ref.id }
  if (ref.collection) {
    data.collection = replaceRef(ref.collection)
  }
  return { '@ref': data }
}

function replaceTime(time: OpleTime) {
  return { '@time': time.toString() }
}

function replaceDate(date: OpleDate) {
  return { '@date': date.toString() }
}

function replaceSet(set: OpleSet) {
  throw Error('not implemented')
}
