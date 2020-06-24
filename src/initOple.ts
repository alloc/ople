import { OpleInitFn, ReadonlyOpleObject } from './types'
import { UnknownProps, Lookup } from 'types'
import { withOple, getOple } from './global'
import { setEffect, restoreEffects } from './Ople'

export const initOple = <
  State extends object = UnknownProps,
  Events extends object = any
>(
  self: any,
  init: OpleInitFn<State, Events>
): ReadonlyOpleObject<State, Events> => {
  withOple(self, init, [
    self,
    bindMethod(self, 'set'),
    bindMethod(self, 'emit'),
  ])
  if (getOple()) {
    setEffect(self, active => {
      if (active) restoreEffects(self)
      else self.dispose()
    })
  }
  return self
}

const bindMethod = <T extends Lookup, K extends keyof T>(
  obj: T,
  key: K
): T[K] => obj[key].bind(obj)
