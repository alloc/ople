import {
  OpleArray,
  OpleCollection,
  OpleCursor,
  OpleDocument,
  OplePage,
  OpleSet,
} from './sync/types'
import { OpleDate, OpleRef, OpleTime } from './values'
import { OpleQuery } from './query'

/**
 * This type replaces array types with `OpleArray` and makes
 * document data immutable.
 *
 * It should only be used by query functions that return a
 * plain object or array. Query functions that return a
 * document should use `OpleQuery.Document` instead.
 */
export type ToQuery<T> = T extends ReadonlyArray<infer U>
  ? OpleArray<U>
  : T extends object
  ? T extends OpleDocument<infer U>
    ? OpleQuery.Document<U>
    : T extends OpleRef<infer U>
    ? OpleQuery.Ref<U>
    : StrictAssignable<T, ToQueryNoop> extends 1
    ? T
    : { [P in keyof T]: ToQuery<T[P]> }
  : T

export type FromQuery<T> = T extends OpleArray<infer U>
  ? FromQuery<U>[]
  : T extends object
  ? T extends OplePage<infer U>
    ? { data: FromQuery<U>[]; before?: OpleCursor; after?: OpleCursor }
    : T extends OpleQuery.Document<infer U>
    ? OpleDocument<U>
    : T extends OpleQuery.Ref<infer U>
    ? OpleRef<U>
    : T extends OpleCollection<any, infer U>
    ? OpleRef<U>
    : StrictAssignable<T, FromQueryNoop> extends 1
    ? T
    : { [P in keyof T]: FromQuery<T[P]> }
  : T

// These object types are never transformed by ToQuery.
type ToQueryNoop =
  | OpleArray
  | OpleCollection
  | OpleCursor
  | OpleDate
  | OplePage
  | OpleSet
  | OpleTime

// These object types are never transformed by FromQuery.
type FromQueryNoop =
  | OpleCursor
  | OpleDate
  | OpleDocument
  | OpleRef
  | OpleSet
  | OpleTime

/** Supports JSON-compatible values only */
export type DeepFreeze<T> = T extends Array<infer Element>
  ? Array<any> extends T
    ? DeepFreezeArray<Element>
    : DeepFreezeProps<T>
  : T extends object
  ? StrictAssignable<T, DeepFreezeNoop> extends 1
    ? T
    : DeepFreezeProps<T>
  : T

type DeepFreezeArray<T> = ReadonlyArray<DeepFreeze<T>>
type DeepFreezeProps<T> = { readonly [P in keyof T]: DeepFreeze<T[P]> }

// These object types are never transformed by DeepFreeze.
type DeepFreezeNoop =
  | OpleArray
  | OpleCollection
  | OpleCursor
  | OpleDate
  | OplePage
  | OpleRef
  | OpleSet
  | OpleTime

/**
 * Resolves to `1` if `T` is assignable to one of the types in `U`,
 * and vice versa, one of the types in `U` is assignable to `T`.
 */
type StrictAssignable<T, U> = T extends U
  ? U extends any
    ? [U] extends [T]
      ? 1
      : never
    : never
  : never
