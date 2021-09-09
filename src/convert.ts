import {
  OpleDocument as OpleDocumentResult,
  OpleDocumentData,
} from './sync/document'
import {
  OpleArray,
  OpleCollection,
  OpleCursor,
  OpleDate,
  OplePage as OplePageResult,
  OpleRef,
  OpleSet,
  OpleTime,
} from './sync/types'

/**
 * Ensure query types are accepted wherever their material version
 * is acceptable. For example, an `OpleArray` can be passed instead
 * of a JavaScript array.
 */
export type OpleInput<T> = T extends ReadonlyArray<infer U>
  ? ReadonlyArray<OpleInput<U>> | OpleArray<OpleInput<U>>
  : T extends object
  ? 1 extends StrictAssignable<T, OpleInputNoop>
    ? T
    : { [P in keyof T]: OpleInput<T[P]> }
  : T

/**
 * Replace material types with their query version.
 * For example, arrays are replaced with `OpleArray`.
 *
 * Only query functions that return a plain object or array
 * should need to wrap their return type with this.
 */
export type OpleResult<T> = T extends ReadonlyArray<infer U>
  ? OpleArray<U>
  : T extends object
  ? 1 extends StrictAssignable<T, OpleResultNoop>
    ? T
    : { [P in keyof T]: OpleResult<T[P]> }
  : T

/**
 * Replace all query types with their material version.
 */
export type Materialize<T> = T extends OpleArray<infer U>
  ? Materialize<U>[]
  : T extends object
  ? T extends OplePageResult<infer U>
    ? OplePage<Materialize<U>>
    : T extends OpleCollection<any, infer U>
    ? OpleRef<U>
    : T extends OpleDocumentResult<infer U>
    ? OpleDocument<U> & OpleDocumentData<U>
    : 1 extends StrictAssignable<T, MaterializeNoop>
    ? T
    : { [P in keyof T]: Materialize<T[P]> }
  : T

interface OplePage<T = any> {
  data: T[]
  before?: OpleCursor
  after?: OpleCursor
}

/**
 * A materialized document with a proxy for direct `data` access.
 *
 * Safe to return from a backend function.
 */
interface OpleDocument<T extends object | null> {
  ref: OpleRef<T>
  data: T
  ts: OpleTime
}

// These types are never transformed by Materialize.
type MaterializeNoop = OpleCursor | OpleDate | OpleRef | OpleSet | OpleTime

// These types are never transformed by QueryInput.
type OpleInputNoop = OpleCursor | OpleDate | OpleRef | OpleSet | OpleTime

// These types are never transformed by QueryResult.
type OpleResultNoop =
  | OpleArray
  | OpleCollection
  | OpleCursor
  | OpleDate
  | OplePageResult
  | OpleRef
  | OpleSet
  | OpleTime

/** Supports JSON-compatible values only */
export type DeepFreeze<T> = T extends Array<infer Element>
  ? Array<any> extends T
    ? DeepFreezeArray<Element>
    : DeepFreezeProps<T>
  : T extends object
  ? 1 extends StrictAssignable<T, DeepFreezeNoop>
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
