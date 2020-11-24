import { EventSource } from 'ee-ts'
import { Class } from 'is'
import { expectOple, withOple } from '../context'
import { Ople } from '../Ople'
import { OpleObject } from '../types'
import { makeSignal } from './signal'

const signalKeyRE = /^on[A-Z]/

let classContext: ClassContext | null = null

interface ClassContext {
  onCreate: OnCreate[]
  onPrepare: OnPrepare[]
}

type OnCreate = (...args: any[]) => void
type OnPrepare = (self: any) => void

export function onCreate(effect: OnCreate) {
  classContext!.onCreate.push(effect)
}

export function onPrepare(effect: OnPrepare) {
  classContext!.onPrepare.push(effect)
}

export type OpleMixin<T extends Ople = OpleObject> = (self: T) => void

// TODO: replace EventSource with CopyEvents
export interface OpleClass<T extends Ople = OpleObject>
  extends Class<T>,
    EventSource<T> {
  /**
   * Call this in another `createClass` mixin to copy all state/behavior.
   */
  mixin: OpleMixin<T>
  /**
   * Prepare a revived instance of this class.
   */
  prepare: OnPrepare
}

export function createClass<T extends Ople>(
  name: string,
  setup: OpleMixin<T>
): OpleClass<T> {
  classContext = { onCreate: [], onPrepare: [] }
  const { onCreate, onPrepare } = classContext

  const Class: OpleClass<T> = new Function(
    `withOple`,
    `constructor`,
    `return function ${name}(...args) {
       withOple(this, constructor, [this, args])
     }`
  )(withOple, (self: T, args: any[]) => {
    for (const create of onCreate) create(...args)
    for (const prepare of onPrepare) prepare(self)
  })

  const selfProxy = { ...ClassHandlers }
  Class.prototype = new Proxy(Class.prototype, selfProxy)

  withOple(Class as any, setup, [Class.prototype])
  Class.mixin = setup
  Class.prepare = self => {
    for (const prepare of onPrepare) prepare(self)
  }

  classContext = null
  Object.assign(selfProxy, InstanceHandlers)
  return Class
}

const ClassHandlers: ProxyHandler<any> = {
  get(prototype, key: string) {
    const value = prototype[key]
    if (!value && signalKeyRE.test(key)) {
      return (prototype[key] = makeSignal(key))
    }
    return value
  },
}

const InstanceHandlers: ProxyHandler<any> = {
  get: (_, key) => Reflect.get(expectOple(), key),
}
