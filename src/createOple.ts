import { o, no } from 'wana'
import { withOple, ople } from './global'
import { Ople } from './Ople'
import { is } from 'is'
import { $effects } from './symbols'
import { ListenerMap } from 'ee-ts'

export type OpleObject<
  State extends object = any,
  Events extends object = any
> = Ople<Events> & State

export type OpleCreateFn<
  State extends object = any,
  Events extends object = any
> = (
  self: OpleObject<State, Events>,
  set: OpleSetFn<State>
) => ListenerMap<Events> | void

export type OpleSetFn<State extends object> = (state: Partial<State>) => void

export function createOple<
  State extends object = any,
  Events extends object = any
>(create: OpleCreateFn<State, Events>) {
  const self: OpleObject<State, Events> = o(new Ople()) as any
  withOple({ effects: self[$effects] }, () => {
    const events = create(self, state => {
      const getters = enhanceState(state)
      for (const key in state) {
        const desc = getters[key]
        if (desc) {
          // Pure getters can be overridden.
          Object.defineProperty(self, key, desc)
        } else {
          // Other properties are assigned.
          self[key] = state[key] as any
        }
      }
    })
    if (events) {
      self.on(events)
    }
  })
  return self
}

//
// Helpers
//

const { defineProperty } = Object

const funcBlacklist = [
  'constructor',
  'setup',
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

function enhanceState(state: object) {
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

  for (const [key, desc] of Object.entries(getters)) {
    const get = desc.get!
    const memo = o(get.bind(state))
    ople.dispose(memo)

    desc.get = memo
    defineProperty(state, key, desc)
  }

  return getters
}
