import { OpleRef, OpleTime } from '../values'

export interface OpleDocumentOptions {
  credentials?: object
  delegates?: object
  ttl?: OpleTime
}

// export type OpleDocument

/**
 * A document whose `data` object cannot be directly mutated.
 */
export interface OpleFrozenDocument<
  T extends object | null = any,
  _T extends object | null = T, // This helps in converting from query type to user type.
> {
  ref: OpleRef<T>
  data: DeepFreeze<T>
  ts: OpleTime
}

export interface OpleDocument<T extends object | null = any> {
  ref: OpleRef<T>
  data: T
  ts: OpleTime
}

/** Supports JSON-compatible values only */
type DeepFreeze<T> = T extends Array<infer Element>
  ? Array<any> extends T
    ? DeepFreezeArray<Element>
    : DeepFreezeProps<T>
  : T extends object
  ? DeepFreezeProps<T>
  : T

type DeepFreezeArray<T> = ReadonlyArray<DeepFreeze<T>>
type DeepFreezeProps<T> = { readonly [P in keyof T]: DeepFreeze<T[P]> }
