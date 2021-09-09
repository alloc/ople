import { OpleCallback } from '../sync/callback'
import { OpleSet } from '../sync/set'
import { OpleDate, OpleRef, OpleTime } from '../values'

export function jsonReplacer(key: string, value: any) {
  if (
    value == null ||
    typeof value != 'object' ||
    Array.isArray(value) ||
    key == '@ref' ||
    key == '@set' ||
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
    case OpleCallback:
      return replaceCallback(value)
  }
  return { '@obj': value }
}

function replaceRef(ref: OpleRef) {
  return { '@ref': { id: ref.id, collection: ref.collection } }
}

function replaceTime(time: OpleTime) {
  return { '@time': time.toString() }
}

function replaceDate(date: OpleDate) {
  return { '@date': date.toString() }
}

function replaceSet(set: OpleSet) {
  // @ts-ignore
  return set.source ? set.expr : { '@set': set.expr }
}

function replaceCallback(cb: OpleCallback) {
  return { '@callback': cb.id }
}
