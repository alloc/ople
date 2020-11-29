import { EventSource, EventKey, EventArgs } from 'ee-ts'
import { Ref, FaunaTime } from 'fauna-lite'
import { Any } from '@alloc/types'
import { Record } from './data/Record'
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
> = ReadonlyOpleObject<T & Record, E>

export interface RecordType<T extends ReadonlyRecord = any>
  extends EventSource<TargetedEvents<T, InferEvents<T>>> {
  /** Decode a serialized record, then cache it. */
  decode(raw: RawRecord): T
  /** The collection ref. */
  [$R]: Ref
}

/** Record data transmitted with a `Ref` and timestamp. */
export interface RawRecord {
  ts: FaunaTime
  ref: Ref
  data: any
}
