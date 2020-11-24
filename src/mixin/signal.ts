import { Any, Disposable } from 'types'
import { no } from 'wana'
import { setHidden } from '../common'
import { expectOple, getOple } from '../context'
import { Ople, setEffect } from '../Ople'
import { makeFunctionType } from './common'

// NOTE: Global listeners can only be created by the prototype.
//       For others to listen he prototype has to forward those events to
//       an `Ople` instance that is globally accessible.

const makeCacheKey = (signal: Signal): any =>
  Symbol.for(signal.name + '.listeners')

export const makeSignal = makeFunctionType(
  <T>(): Signal<T> =>
    function signal(this: any, handler: Handler<T>): Listener<T> {
      // TODO: skip this check in production?
      if ('signal' in handler) {
        throw Error('Signal handlers cannot be reused')
      }

      const listener = Object.setPrototypeOf(handler, ListenerType)
      listener.signal = signal

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
export function emit<T>(signal: Signal<T>, ...args: SignalArgs<T>) {
  const target: any = no(expectOple())
  const cacheKey = makeCacheKey(signal)
  let cache: Set<Handler> = target.constructor[cacheKey]
  cache = target[cacheKey]
  if (cache && cache.size) {
    // TODO: set `target` as Ople context when notifying global listeners
  }
}

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
  readonly signal: Signal<T>
  /**
   * The `Ople` context this listener was created in.
   *
   * This property only exists when listening.
   */
  ople?: Ople
}

type SignalArgs<T> = [T] extends [Any] ? any[] : T extends any[] ? T : [T]

interface Handler<T = any> {
  (...args: SignalArgs<T>): boolean | void
}

const ListenerType = {
  constructor: Function,
  dispose(this: Listener) {
    // TODO
  },
}
