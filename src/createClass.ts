import { Ople } from './Ople'
import { initOple } from './initOple'
import { ReadonlyOpleObject, OpleInitFn } from './types'
import { UnknownProps } from 'types'
import { Class } from 'is'

export function createClass<
  State extends object = UnknownProps,
  Events extends object = any,
  Args extends ReadonlyArray<any> = any[]
>(
  name: string,
  getInit: (...args: Args) => OpleInitFn<State, Events>,
  Super: Class = Ople
): new (...args: Args) => ReadonlyOpleObject<State, Events> {
  if (!(Super.prototype instanceof Ople)) {
    throw TypeError('Super class must extend the Ople class')
  }
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
  )(initOple, Super, getInit)
  Object.setPrototypeOf(ctr.prototype, Super.prototype)
  return ctr as any
}
