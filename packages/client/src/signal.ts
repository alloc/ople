import { Any, Disposable } from 'types'
import { no } from 'wana'
import { makeFunctionType, setHidden } from './common'
import { getOple, withOple } from './context'
import { Ople, setEffect } from './Ople'

const makeCacheKey = (signal: Function): any =>
  Symbol.for(signal.name + '.listeners')

export const signalKeyRE = /^(on|will|did)[A-Z]/

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
 * Cannot be called outside an `Ople` context.
 */
export const emit = no(<T>(signal: Signal<T>, ...args: SignalArgs<T>) => {
  const cacheKey = makeCacheKey(signal)
  const cache: Set<Listener> = signal.target[cacheKey]
  if (cache && cache.size) {
    for (const listener of cache) {
      if (listener.ople) {
        withOple(listener.ople, listener, args)
      } else {
        listener(...args)
      }
    }
  }
})

/**
 * The source of a single event type.
 */
export interface Signal<T = any> {
  (handler: Handler<T>): Listener<T>
  /** The signal target. */
  target: any
}

/**
 * The listener of an `ople.Signal` object.
 */
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
