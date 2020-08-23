import { UnknownProps } from 'types'
import { Ople } from './Ople'
import { EventArgs, EventKey } from 'ee-ts'

/** Pass `true` to enable the effect. Pass `false` to disable. */
export type OpleEffect = (active: boolean) => void

export type OpleObject<
  State extends object = UnknownProps,
  Events extends object = any
> = Ople<Events> & State

type OmitWrites<T> = Omit<T, 'set' | 'emit'>

export interface ReadonlyOple<Events extends object = any>
  extends OmitWrites<Ople<Events>> {}

export type ReadonlyOpleObject<
  State extends object = UnknownProps,
  Events extends object = any
> = ReadonlyOple<Events> &
  { readonly [P in keyof OmitWrites<State>]: Immutable<State[P]> }

export type OpleInitFn<
  State extends object = UnknownProps,
  Events extends object = any
> = (
  self: OpleObject<State, Events>,
  set: OpleSetFn<State>,
  emit: OpleEmitFn<Events>
) => void

export type OpleSetFn<State extends object = UnknownProps> = (
  state: Partial<State>
) => void

export type OpleEmitFn<T extends object = any> = <K extends EventKey<T>>(
  key: K,
  ...args: EventArgs<T, K>
) => void

/** Convert a mutable type into a readonly type */
export type Immutable<T> = T extends ReadonlyArray<any>
  ? { readonly [K in keyof T]: Immutable<T[K]> }
  : T extends ReadonlyMap<infer K, infer V>
  ? ReadonlyMap<Immutable<K>, Immutable<V>>
  : T extends ReadonlySet<infer V>
  ? ReadonlySet<Immutable<V>>
  : T
