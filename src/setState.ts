import { is } from 'is'
import { no, o, isDerived } from 'wana'
import { expectOple, withOple } from './context'
import { attachAuto } from './auto'
import { OpleObject } from './types'
import { AnyFn } from 'types'

const { defineProperty } = Object

const getKeyRE = /^get[A-Z]/

export function setState(state: object) {
  const parent = expectOple()

  const descs = Object.getOwnPropertyDescriptors(state)
  for (const key in descs) {
    const prevDesc = Object.getOwnPropertyDescriptor(parent, key)
    const prevGet = prevDesc && prevDesc.get
    if (isDerived(prevGet)) {
      prevGet.dispose()
    }
    const desc = descs[key]
    if (is.string(key) && !getKeyRE.test(key)) {
      const { value, get, set } = desc
      if (set) {
        desc.set = bindAction(parent, set)
      } else if (get) {
        const memo = (desc.get = o(get.bind(parent)))
        attachAuto(memo.auto)
      } else if (is.function(value) && !is.asyncFunction(value)) {
        desc.value = bindAction(parent, value)
      }
    }
    defineProperty(parent, key, desc)
  }
}

/** Disable implicit observation and set the `Ople` context. */
const bindAction = (parent: OpleObject, fn: AnyFn): AnyFn =>
  no((...args) => withOple(parent, fn, args))
