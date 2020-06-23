import { UnknownProps } from 'types'
import { Ople } from './Ople'
import { EventArgs, EventKey } from 'ee-ts'

/** Pass `true` to enable the effect. Pass `false` to disable. */
export type OpleEffect = (active: boolean) => void

export type OpleObject<
  State extends object = UnknownProps,
  Events extends object = any
> = Ople<Events> & State

export interface ReadonlyOple<Events extends object = any>
  extends Omit<Ople<Events>, 'set' | 'emit'> {}

export type ReadonlyOpleObject<
  State extends object = UnknownProps,
  Events extends object = any
> = ReadonlyOple<Events> & Immutable<State>

export interface OpleContext<
  State extends object = UnknownProps,
  Events extends object = any
> {
  /** The current state being created or modified */
  state: OpleObject<State, Events> | null
  /** Call the given `effect` when `ople.state` is disposed */
  dispose(effect: OpleEffect): void
}

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
export type Immutable<T> = T extends AtomicObject
  ? T
  : T extends ReadonlyMap<infer K, infer V> // Map extends ReadonlyMap
  ? ReadonlyMap<Immutable<K>, Immutable<V>>
  : T extends ReadonlySet<infer V> // Set extends ReadonlySet
  ? ReadonlySet<Immutable<V>>
  : T extends WeakReferences
  ? T
  : T extends object
  ? { readonly [K in keyof T]: Immutable<T[K]> }
  : T

/** Object types that should never be mapped */
type AtomicObject =
  | Function
  | Promise<any>
  | Date
  | RegExp
  | Boolean
  | Number
  | String

/**
 * These should also never be mapped but must be tested after regular Map and
 * Set
 */
type WeakReferences = WeakMap<any, any> | WeakSet<any>
