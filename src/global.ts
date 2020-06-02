import { UnknownProps } from 'types'
import { OpleObject } from './types'
import { Ople } from './Ople'

// The current `Ople` being created or modified.
let current: Ople | null = null

/** Activate the `context` while executing the `effect` */
export function withOple(state: Ople, effect: () => void) {
  const parent = current
  current = state
  try {
    effect()
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

type GetOple = <
  State extends object = UnknownProps,
  Events extends object = any
>() => OpleObject<State, Events> | null

type ExpectOple = <
  State extends object = UnknownProps,
  Events extends object = any
>() => OpleObject<State, Events>
