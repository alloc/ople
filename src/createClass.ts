import { Ople } from './Ople'
import { initOple } from './initOple'
import { ReadonlyOpleObject, OpleInitFn } from './types'
import { UnknownProps } from 'types'

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
