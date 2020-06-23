import { UnknownProps } from 'types'
import { Ople } from './Ople'
import { EventArgs, EventKey } from 'ee-ts'

/** Pass `true` to enable the effect. Pass `false` to disable. */
export type OpleEffect = (active: boolean) => void

export type OpleObject<
  State extends object = UnknownProps,
  Events extends object = any
> = Ople<Events> & State

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
