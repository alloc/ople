import { is } from '@alloc/is'
import { Any, Disposable } from '@alloc/types'
import { makeFunctionType, setHidden } from './common'
import { getOple, setEffect, withOple } from './Ople/context'
import { Ople } from './Ople'

const makeCacheKey = (signal: Function): any =>
  Symbol.for(signal.name + '.listeners')

export const signalKeyRE = /^(on|will|did)[A-Z]/

export function emit<T>(signal: OpleSignal<T>, ...args: HandlerArgs<T>) {
  const cacheKey = makeCacheKey(signal)
  const cache: Set<Listener> = signal.target[cacheKey]
  if (cache && cache.size) {
    let listener: Listener
    function recv() {
      listener(...args) !== false || listener.dispose()
    }
    for (listener of Array.from(cache)) {
      withOple(listener.context || null, recv)
    }
  }
}

export const makeSignal = makeFunctionType(
  <T>(target: any): OpleSignal<T> =>
    function signal(listener: Listener) {
      if ('signal' in (listener as any)) {
        throw Error('Signal handlers cannot be reused')
      }

      const cacheKey = makeCacheKey(signal)
      let cache: Set<Listener> = target[cacheKey]
      if (!cache) {
        setHidden(target, cacheKey, (cache = new Set()))
      }

      listener.signal = signal as any
      listener.dispose = disposeListener

      setEffect(listener, active => {
        if (active) {
          cache.add(listener)
          listener.context = getOple()
        } else {
          cache.delete(listener)
          listener.context = void 0
        }
      })

      return listener
    } as any,
  { getOple, makeCacheKey }
)

/**
 * Proxy traps for on-demand `ople.Signal` properties bound
 * to their target.
 */
export const signalTraps: ProxyHandler<any> = {
  get(_, key, target) {
    if (is.string(key) && signalKeyRE.test(key)) {
      const signal = makeSignal(key, target)
      signal.target = target
      return signal
    }
  },
}

interface A {
  b(): void
  b(a: number): number
}

// import {AnyFn} from '@alloc/types'
// type SignalFactory<T extends Record<string, AnyFn>> = <P extends keyof T>(name: P) => 

/** The source of a single event type */
export interface OpleSignal<T = any> {
  (handler: Handler<T>): Listener<T>
  (target: T extends [infer U] ? U extends  handler: Handler<T>): Listener<T>
}

/** The listener of an `ople.Signal` object */
export interface Listener<T = any> extends Handler<T>, Disposable {
  /** The signal being listened to. */
  signal: OpleSignal<T>
  /** The signal target. */
  target?: any
  /**
   * The `Ople` context this listener was created in.
   *
   * This property only exists when listening.
   */
  context?: Ople
}

//
// Internal
//

type HandlerArgs<T> = [T] extends [Any] ? any[] : T extends any[] ? T : [T]

interface Handler<T = any> {
  (...args: HandlerArgs<T>): boolean | void
}

function disposeListener(this: Listener) {
  if (this.context) {
    withOple(this.context, setEffect, [this, null])
  }
}
