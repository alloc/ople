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
  const ctr = new Function(
    'initOple',
    'Ople',
    'getInit',
    `return function ${name}() {
       return initOple(
         Ople.call(this),
         getInit.apply(null, arguments)
       )
     }`
  )(initOple, Ople, getInit)
  Object.setPrototypeOf(ctr.prototype, Ople.prototype)
  return ctr as any
}
