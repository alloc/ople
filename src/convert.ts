import {
  OpleArray,
  OpleCollection,
  OpleCursor,
  OpleDate,
  OpleDocument,
  OplePage,
  OpleRef,
  OpleSet,
  OpleTime,
} from './sync/types'

export type OpleInput<T> = T extends ReadonlyArray<infer U>
  ? ReadonlyArray<OpleInput<U>> | OpleArray<OpleInput<U>>
  : T extends object
  ? 1 extends StrictAssignable<T, QueryInputNoop>
    ? T
    : { [P in keyof T]: OpleInput<T[P]> }
  : T

/**
 * This type replaces array types with `OpleArray` and makes
 * document data immutable.
 *
 * It should only be used by query functions that return a
 * plain object or array.
 */
export type OpleResult<T> = T extends ReadonlyArray<infer U>
  ? OpleArray<U>
  : T extends object
  ? T extends OpleDocument<T>
    ? OpleDocument.Result<T>
    : 1 extends StrictAssignable<T, QueryResultNoop>
    ? T
    : { [P in keyof T]: OpleResult<T[P]> }
  : T

/**
 * Materialize a query result by removing any query-specific
 * interfaces.
 */
export type Materialize<T> = T extends OpleArray<infer U>
  ? Materialize<U>[]
  : T extends object
  ? T extends OplePage<infer U>
    ? { data: Materialize<U>[]; before?: OpleCursor; after?: OpleCursor }
    : T extends OpleCollection<any, infer U>
    ? OpleRef<U>
    : 1 extends StrictAssignable<T, MaterializeNoop>
    ? T
    : { [P in keyof T]: Materialize<T[P]> }
  : T

// These types are never transformed by QueryInput.
type QueryInputNoop =
  | OpleCursor
  | OpleDate
  | OplePage
  | OpleRef
  | OpleSet
  | OpleTime

// These types are never transformed by QueryResult.
type QueryResultNoop =
  | OpleArray
  | OpleCollection
  | OpleCursor
  | OpleDate
  | OplePage
  | OpleRef
  | OpleSet
  | OpleTime

// These types are never transformed by Materialize.
type MaterializeNoop =
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
