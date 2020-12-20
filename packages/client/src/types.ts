import { Pick, UnknownProps } from '@alloc/types'
import { Ople } from './Ople'
import { Record } from './Record'
import { Signal } from './Signal'

export interface RecordCache {
  [ref: string]: Record & { [key: string]: unknown }
}

/** Pass `true` to enable the effect. Pass `false` to disable. */
export type OpleEffect = (active: boolean) => void

/** An `Ople` object with added state. */
export type OpleObject<State extends object = UnknownProps> = ReadonlyOple &
  State & { set: OpleSetFn<State> }

/** An `Ople` object without its `set` method. */
export interface ReadonlyOple extends Omit<Ople, 'set'> {}

/** An `Ople` object with immutable state. */
export type ReadonlyOpleObject<
  State extends object = UnknownProps
> = ReadonlyOple & { readonly [P in keyof State]: Immutable<State[P]> }

/** Get the observable state of an `Ople` object. */
export type OpleState<T extends ReadonlyOple> = Pick<T, StateKeys<T>>

export type OpleInitFn<T extends Ople> = (self: T, set: OpleSetFn<T>) => void

export type OpleSetFn<State extends object> = (state: Partial<State>) => void

/** Convert a mutable type into a readonly type */
export type Immutable<T> = T extends ReadonlyArray<any>
  ? { readonly [K in keyof T]: Immutable<T[K]> }
  : T extends ReadonlyMap<infer K, infer V>
  ? ReadonlyMap<Immutable<K>, Immutable<V>>
  : T extends ReadonlySet<infer V>
  ? ReadonlySet<Immutable<V>>
  : T

type StateKeys<T> = {
  [P in keyof T]: P extends keyof Ople ? never : T[P] extends Signal ? never : P
}[keyof T]
