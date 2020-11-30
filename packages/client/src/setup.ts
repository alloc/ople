import { Class } from 'is'
import { expectOple, getOple, withOple } from './context'
import { makeSignal, signalKeyRE } from './signal'
import { $prepareFns } from './symbols'

let setupContext: SetupContext | null = null

export function setup<T extends Class>(
  opleClass: T & {
    [$prepareFns]?: OnPrepare[]
  },
  setupFn?: (self: InstanceType<T>) => OnPrepare | void
) {
  const prepareFns: OnPrepare[] = []

  if (setupFn) {
    const traps = Object.create(ClassTraps)
    const self: any = new Proxy(opleClass.prototype, traps)

    setupContext = { prepareFns }
    const prepareFn = withOple(opleClass, setupFn, [self])
    if (prepareFn) prepareFns.push(prepareFn)
    setupContext = null

    // The `self` proxy acts differently within listeners.
    Object.setPrototypeOf(traps, InstanceTraps)
  }

  const getters = [] // TODO: crawl prototype for getters
  if (getters.length) {
    prepareFns.unshift(() => {
      const self = getOple()
      // TODO: wrap getters with wana.o
    })
  }

  if (prepareFns.length) {
    opleClass[$prepareFns] = prepareFns
  }

  // TODO: wrap every method with wana.no
}

/**
 * Listener passed to `onPrepare` hook.
 */
export type OnPrepare = () => void

/**
 * Prepare an instance before it's returned by its constructor
 * or reviver.
 */
export function onPrepare(effect: OnPrepare) {
  if (!setupContext) throw Error('Illegal "onPrepare" call')
  setupContext.prepareFns.push(effect)
}

/**
 * If you called `onPrepare` within a `setup` callback, you must call this
 * inside the class constructor after you've initialized all instance properties,
 * or else your `onPrepare` listeners will never run.
 */
export function prepare(self: any) {
  if (self.constructor[$prepareFns]) {
    withOple(self, prepareInstance)
  }
}

//
// Internal
//

interface SetupContext {
  prepareFns: OnPrepare[]
}

const ClassTraps: ProxyHandler<any> = {
  get(prototype, key: string) {
    const value = prototype[key]
    if (!value && signalKeyRE.test(key)) {
      return (prototype[key] = makeSignal(key))
    }
    return value
  },
}

const InstanceTraps: ProxyHandler<any> = {
  get: makeInstanceTrap('get'),
  set: makeInstanceTrap('set'),
}

function makeInstanceTrap(key: keyof ProxyHandler<any>) {
  return (_target: any, ...args: [any, any]) =>
    Reflect[key](expectOple(), ...args)
}

function prepareInstance() {
  const self = getOple()
  for (const prepareFn of self.constructor[$prepareFns]) {
    prepareFn()
  }
}
