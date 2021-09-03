import { OpleArray } from './sync/array'
import { OpleCollection } from './sync/collection'
import { OpleDocument, OpleFrozenDocument } from './sync/document'
import { OpleCursor, OplePage } from './sync/page'
import { OpleSet } from './sync/set'
import { OpleDate, OpleRef, OpleTime } from './values'

export type ToQuery<T> = T extends ReadonlyArray<infer U>
  ? OpleArray<U>
  : T extends object
  ? T extends OpleDocument<infer U>
    ? OpleFrozenDocument<ToQuery<U>, U>
    : T extends
        | OpleRef
        | OpleCollection
        | OpleTime
        | OpleDate
        | OpleSet
        | OpleCursor
        | OplePage
    ? T
    : { [P in keyof T]: ToQuery<T[P]> }
  : T

export type FromQuery<T> = T extends OpleArray<infer U>
  ? FromQuery<U>[]
  : T extends object
  ? T extends OplePage<infer U>
    ? { data: FromQuery<U>[]; before?: OpleCursor; after?: OpleCursor }
    : T extends OpleFrozenDocument<any, infer U>
    ? OpleDocument<U>
    : T extends OpleCollection<any, infer U>
    ? OpleRef<U>
    : T extends OpleRef | OpleTime | OpleDate | OpleSet | OpleCursor
    ? T
    : { [P in keyof T]: FromQuery<T[P]> }
  : T
