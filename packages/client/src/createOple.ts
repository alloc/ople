import { Ople } from './Ople'
import { OpleInitFn } from './types'
import { UnknownProps } from 'types'
import { initOple } from './initOple'

export function createOple<
  State extends object = UnknownProps,
  Events extends object = any
>(init: OpleInitFn<State, Events>) {
  return initOple(new Ople(), init)
}
