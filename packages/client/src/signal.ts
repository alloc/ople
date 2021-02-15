import { is } from '@alloc/is'
import { Any, Disposable } from '@alloc/types'
import { makeFunctionType, setHidden } from './common'
import { getOple, withOple } from './context'
import { Ople, setEffect } from './Ople'

const makeCacheKey = (signal: Function): any =>
  Symbol.for(signal.name + '.listeners')

export const signalKeyRE = /^(on|will|did)[A-Z]/

export function emit<T>(signal: Signal<T>, ...args: SignalArgs<T>) {
  const cacheKey = makeCacheKey(signal)
  const cache: Set<Listener> = signal.target[cacheKey]
  if (cache && cache.size) {
    let listener: Listener
    function recv() {
      listener(...args) !== false || listener.dispose()
    }
    for (listener of Array.from(cache)) {
      withOple(listener.ople || null, recv)
    }
  }
}

export const makeSignal = makeFunctionType(
  <T>(target: any): Signal<T> =>
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

      const ople = getOple()
      if (ople) {
        setEffect(listener, active => {
          if (active) {
            cache.add(listener)
            listener.ople = ople
          } else {
            cache.delete(listener)
            listener.ople = void 0
          }
        })
      } else {
        cache.add(listener)
      }

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

/** The source of a single event type */
export interface Signal<T = any> {
  (handler: Handler<T>): Listener<T>
  /** The signal target. */
  target: any
}

/** The listener of an `ople.Signal` object */
export interface Listener<T = any> extends Handler<T>, Disposable {
  /** The signal being listened to. */
  signal: Signal<T>
  /**
   * The `Ople` context this listener was created in.
   *
   * This property only exists when listening.
   */
  ople?: Ople
}

//
// Internal
//

type SignalArgs<T> = [T] extends [Any] ? any[] : T extends any[] ? T : [T]

interface Handler<T = any> {
  (...args: SignalArgs<T>): boolean | void
}

function disposeListener(this: Listener) {
  if (this.ople) {
    setEffect(this, null, this.ople)
  } else {
    const cacheKey = makeCacheKey(this.signal)
    this.signal.target[cacheKey].delete(this)
  }
}
