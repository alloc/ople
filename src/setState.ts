import { is } from 'is'
import { no, o, isDerived } from 'wana'
import { expectOple } from './global'
import { attachAuto } from './auto'

const { defineProperty } = Object

export function setState(state: object) {
  const parent = expectOple()

  const props = Object.getOwnPropertyDescriptors(state)
  for (const [key, desc] of Object.entries(props)) {
    const prevDesc = Object.getOwnPropertyDescriptor(parent, key)
    const prevGet = prevDesc && prevDesc.get
    if (isDerived(prevGet)) {
      prevGet.dispose()
    }
    if (isEnhancedProperty(key, desc)) {
      const { value, get, set } = desc
      if (set) {
        desc.set = no(set)
      } else if (get) {
        const memo = (desc.get = o(get.bind(parent)))
        attachAuto(memo.auto)
      } else if (is.function(value) && !is.asyncFunction(value)) {
        desc.value = no(value)
      }
    }
    defineProperty(parent, key, desc)
  }
}

function isEnhancedProperty(key: string, desc: PropertyDescriptor) {
  return (
    desc.configurable !== false &&
    is.string(key) &&
    key[0] !== '_' &&
    !/^get[A-Z]/.test(key)
  )
}
