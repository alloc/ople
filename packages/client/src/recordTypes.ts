import { EventSource, EventKey, EventArgs } from 'ee-ts'
import { Any } from '@alloc/types'
import { OpleRef, OpleTime } from './values'
import { OpleRecord } from './Record'
import { $R } from './symbols'

type InferEvents<T> = [T] extends [Any]
  ? any
  : T extends EventSource<infer E>
  ? E
  : never

// Note: Overloads are incompatible with mapped types.
type TargetedEvents<T, E> = {
  [P in EventKey<E>]: (target: T, ...args: EventArgs<E, P>) => void
}

export type ReadonlyRecord<
  T extends object = any,
  E extends object = any
> = ReadonlyOpleObject<T & OpleRecord, E>

export interface RecordType<T extends ReadonlyRecord = any>
  extends EventSource<TargetedEvents<T, InferEvents<T>>> {
  /** Decode a serialized record, then cache it. */
  decode(raw: RawRecord): T
  /** The collection ref. */
  [$R]: OpleRef
}

/** Record data transmitted with a `Ref` and timestamp. */
export interface RawRecord {
  ts: OpleTime
  ref: OpleRef
  data: any
}
