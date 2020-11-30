import { Any, Disposable } from 'types'
import { no } from 'wana'
import { makeFunctionType, setHidden } from './common'
import { expectOple, getOple, withOple } from './context'
import { Ople, setEffect } from './Ople'
import { globals } from './globals'

const makeCacheKey = (signal: Signal): any =>
  Symbol.for(signal.name + '.listeners')

export const signalKeyRE = /^(on|will|did)[A-Z]/

export const makeSignal = makeFunctionType(
  <T>(): Signal<T> =>
    function signal(this: any, handler: Handler<T>): Listener<T> {
      // TODO: skip this check in production?
      if ('signal' in handler) {
        throw Error('Signal handlers cannot be reused')
      }

      const ople = getOple()
      let target = no(this !== globalThis ? this : ople)

      // TODO: skip this check in production?
      if (!target) {
        throw Error('Signal has no target')
      }

      const cacheKey = makeCacheKey(signal)
      let cache: Set<Listener> = target[cacheKey]
      if (!cache) {
        setHidden(target, cacheKey, (cache = new Set()))
      }

      const listener = handler as Listener
      listener.signal = signal
      listener.target = target
      listener.dispose = disposeListener

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
    },
  { getOple, makeCacheKey }
)

/**
 * Cannot be called outside an `Ople` context.
 */
export const emit = no(<T>(signal: Signal<T>, ...args: SignalArgs<T>) => {
  const target: any = expectOple()
  const cacheKey = makeCacheKey(signal)
  let cache = target.constructor[cacheKey] as Set<Listener> | undefined
  if (cache && cache.size) {
    for (const listener of cache) {
      if (listener.ople) {
        withOple(listener.ople, listener, args)
      } else {
        listener(...args)
      }
    }
  }
  cache = target[cacheKey]
  if (cache && cache.size) {
    withOple(target, classEmit, [cache, args])
  }
})

/**
 * The source of a single event type.
 */
export interface Signal<T = any> {
  (handler: Handler<T>): Listener<T>
}

/**
 * The listener of an `ople.Signal` object.
 */
export interface Listener<T = any> extends Handler<T>, Disposable {
  /** The signal being listened to. */
  signal: Signal<T>
  /** The signal target. */
  target: any
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
    withOple(this.ople, setEffect, [this, null])
  } else {
    const cacheKey = makeCacheKey(this.signal)
    this.target[cacheKey].delete(this)
  }
}

// Ople classes may have class-wide listeners, which run when any
// instance emits the associated signal.
function classEmit(cache: Set<Listener>, args: any[]) {
  for (const listener of cache) {
    listener(...args)
  }
}
