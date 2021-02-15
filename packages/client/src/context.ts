import { UnknownProps } from '@alloc/types'
import { OpleObject } from './types'
import { Ople } from './Ople'
import { Record } from './Record'

// The current `Ople` being created or modified.
let current: any = null

/** Use `state` as the Ople context until `effect` returns */
export function withOple<In extends any[], Out>(
  state: Ople | null,
  effect: (...args: In) => Out,
  args?: In
): Out {
  const parent = current
  current = state
  try {
    return effect.apply(null, args!)
  } finally {
    current = parent
  }
}

export const getOple = <State extends object = UnknownProps>() =>
  current as OpleObject<State> | null

export function expectOple(): OpleObject
export function expectOple<State extends object>(): OpleObject<State>
export function expectOple() {
  if (current) {
    return current
  }
  throw Error('Expected an Ople context')
}

export function expectRecord<T extends Record>(): T {
  if (current instanceof Record) {
    return current as any
  }
  throw Error('Expected a Record context')
}
