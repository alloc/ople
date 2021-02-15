import { is } from '@alloc/is'
import { no, o, isDerived } from 'wana'
import { expectOple, withOple } from './context'
import { attachAuto } from './auto'
import { OpleObject } from './types'
import { AnyFn } from '@alloc/types'

const { defineProperty } = Object

const getKeyRE = /^get[A-Z]/

export function setState(state: object, context = expectOple()) {
  const descs = Object.getOwnPropertyDescriptors(state)
  for (const key in descs) {
    const prevDesc = Object.getOwnPropertyDescriptor(context, key)
    const prevGet = prevDesc && prevDesc.get
    if (isDerived(prevGet)) {
      prevGet.dispose()
    }
    const desc = descs[key]
    if (is.string(key) && !getKeyRE.test(key)) {
      const { value, get, set } = desc
      if (set) {
        desc.set = bindAction(context, set)
      } else if (get) {
        const memo = (desc.get = o(get.bind(context)))
        attachAuto(memo.auto)
      } else if (is.function(value) && !is.asyncFunction(value)) {
        desc.value = bindAction(context, value)
      }
    }
    defineProperty(context, key, desc)
  }
}

/** Disable implicit observation and set the `Ople` context. */
const bindAction = (context: OpleObject, fn: AnyFn): AnyFn =>
  no((...args) => withOple(context, fn, args))
