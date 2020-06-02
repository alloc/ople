import {
  Disposable,
  EventEmitter as EE,
  EventKey,
  ListenerMap,
  Listener,
  $addListener,
} from 'ee-ts'
import { no } from 'wana'
import { UnknownProps } from 'types'
import { OpleEffect, OpleObject } from './types'
import { getOple, expectOple } from './global'
import { enhanceState } from './enhanceState'
import { $effects } from './symbols'

/** The base class of objects created by `createOple` */
export class Ople<Events extends object = any> extends EE<Events> {
  protected [$effects]: OpleEffect[] = []

  /**
   * Use the properties defined in the given `state` object to update
   * this object's values. Like `Object.assign` but with support for
   * memoized getters (via `get` syntax).
   */
  set<State extends object>(state: Partial<State>) {
    const self: any = this
    const getters = enhanceState(state)
    for (const key in state) {
      const desc = getters[key]
      if (desc) {
        // Pure getters are defined.
        Object.defineProperty(self, key, desc)
      } else {
        // Remaining values are assigned.
        self[key] = state[key]
      }
    }
  }

  /**
   * When `effect` is defined, it will be disposed when this object is.
   * When undefined, this object is disposed along with any effects.
   */
  dispose(effect?: Disposable) {
    const effects = this[$effects]
    if (effect) {
      effects.push(effect)
    } else {
      effects.forEach(effect => effect.dispose())
    }
  }

  // @override
  protected [$addListener](
    arg: EventKey<Events> | ListenerMap<Events>,
    fn?: Listener<Events>,
    disposables?: Disposable[],
    once?: boolean
  ): this | Listener<Events> {
    const ople = getOple()
    // TODO: make `dispose` affect one-time listeners
    if (ople && !disposables && !once) {
      disposables = ople[$effects]
    }
    return super[$addListener](arg, fn, disposables, once)
  }
}

const proto = Ople.prototype

// Avoid observation of event listeners.
proto.emit = no(proto.emit)
