import { Ople } from './Ople'
import { withOple } from './global'
import { OpleInitFn, OpleObject } from './types'
import { UnknownProps, Lookup } from 'types'

export function createOple<
  State extends object = UnknownProps,
  Events extends object = any
>(init: OpleInitFn<State, Events>) {
  return initOple(new Ople(), init)
}

//
// Internal
//

const initOple = <
  State extends object = UnknownProps,
  Events extends object = any
>(
  self: any,
  init: OpleInitFn<State, Events>
): OpleObject<State, Events> => {
  withOple(self, init, [
    self,
    bindMethod(self, 'set'),
    bindMethod(self, 'emit'),
  ])
  return self
}

const bindMethod = <T extends Lookup, K extends keyof T>(
  obj: T,
  key: K
): T[K] => obj[key].bind(obj)
