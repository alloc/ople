import { is } from 'is'
import { no, o } from 'wana'
import { getOple } from './global'

const { defineProperty } = Object

const funcBlacklist = [
  'constructor',
  'dispose',
  'valueOf',
  'toString',
  'toLocaleString',
]

function isEnhancedProperty(key: string, desc: PropertyDescriptor) {
  return (
    desc.configurable !== false &&
    is.string(key) &&
    key[0] !== '_' &&
    !/^get[A-Z]/.test(key) &&
    !funcBlacklist.includes(key)
  )
}

export function enhanceState(state: object) {
  const getters: PropertyDescriptorMap = {}

  for (const [key, desc] of Object.entries(
    Object.getOwnPropertyDescriptors(state)
  )) {
    if (isEnhancedProperty(key, desc)) {
      let { value, get, set } = desc
      if (get && !set) {
        if (getters && !desc.set) {
          getters[key] = desc
        }
      } else {
        if (set) {
          desc.set = no(set)
        } else if (is.function(value) && !is.asyncFunction(value)) {
          desc.value = no(value)
        } else {
          continue
        }
        defineProperty(state, key, desc)
      }
    }
  }

  const ople = getOple()
  if (ople) {
    for (const [key, desc] of Object.entries(getters)) {
      const get = desc.get!
      const memo = o(get.bind(state))
      ople.dispose(memo)

      desc.get = memo
      defineProperty(state, key, desc)
    }
  }

  return getters
}
