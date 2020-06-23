import { Ople, setEffect, restoreEffects } from './Ople'
import { withOple, getOple } from './global'
import { OpleInitFn, ReadonlyOpleObject } from './types'
import { UnknownProps, Lookup } from 'types'

export function createOple<
  State extends object = UnknownProps,
  Events extends object = any
>(init: OpleInitFn<State, Events>) {
  return initOple(new Ople(), init)
}

export function createClass<
  State extends object = UnknownProps,
  Events extends object = any,
  Args extends ReadonlyArray<any> = any[]
>(
  name: string,
  getInit: (...args: Args) => OpleInitFn<State, Events>
): new (...args: Args) => ReadonlyOpleObject<State, Events> {
  function ctr(this: Ople, ...args: Args) {
    const self = initOple(Ople.call(this), getInit(...args))
    Object.setPrototypeOf(self, ctr.prototype)
    return self
  }
  const nameDesc = Object.getOwnPropertyDescriptor(ctr, 'name')
  Object.defineProperty(ctr, 'name', { ...nameDesc, value: name })
  Object.setPrototypeOf(ctr.prototype, Ople.prototype)
  return ctr as any
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
