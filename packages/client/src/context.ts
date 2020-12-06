import { UnknownProps } from 'types'
import { OpleObject } from './types'
import { Ople } from './Ople'

// The current `Ople` being created or modified.
let current: Ople | null = null

/** Use `state` as the Ople context until `effect` returns */
export function withOple<Events extends object, In extends any[], Out>(
  state: Ople<Events>,
  effect: (...args: In) => Out,
  args?: In
) {
  const parent = current
  current = state
  try {
    return effect.apply(null, args!)
  } finally {
    current = parent
  }
}

export const getOple: GetOple = () => current as any

export const expectOple: ExpectOple = () => {
  if (!current) {
    throw Error('Expected to be called in an Ople context')
  }
  return current as any
}

interface GetOple {
  <State extends object = UnknownProps>(): OpleObject<State> | null
}

interface ExpectOple {
  <State extends object = UnknownProps>(): OpleObject<State>
}
