import { EventEmitter, EventKey, Listener } from 'ee-ts'
import { no, o } from 'wana'
import { getOple, withOple, expectOple } from './context'
import { OpleEffect, OpleObject } from './types'
import { setState } from './setState'
import { $effects, $disposed } from './symbols'
import { Disposable } from 'types'
import { setHidden } from './common'
import { globals } from './globals'

interface OpleListener extends Listener, Disposable {
  effect: Function
}

/** The base class of objects created by `createOple` */
export class Ople<Events extends object = any> extends EventEmitter<Events> {
  protected [$effects]: Map<object, OpleEffect>
  protected [$disposed]: boolean

  constructor() {
    super()
    setHidden(this, $effects, new Map())
    setHidden(this, $disposed, false)
    return o(this)
  }

  /**
   * Use the properties defined in the given `state` object to update
   * this object's values. Like `Object.assign` but with support for
   * memoized getters (via `get` syntax).
   */
  set<State extends object>(state: Partial<State>) {
    withOple(this, setState, [state])
  }

  /** Disable all effects managed by this object. */
  dispose() {
    if (!this[$disposed]) {
      this[$disposed] = true
      this[$effects].forEach(effect => effect(false))
    }
  }

  // @override
  protected _emit(key: string, args: any[]) {
    if (globals.onEmit && key !== 'emit') {
      globals.onEmit(this, key, args)
    }
    super._emit(key, args)
  }

  // @override
  protected _addListener(key: EventKey<Events>, fn: Listener) {
    const parent = getOple()
    if (parent) {
      const listener = ((...args) => withOple(parent, fn, args)) as OpleListener
      listener.effect = fn
      listener.dispose = () => withOple(parent, setEffect, [fn, null])

      setEffect(fn, active => {
        if (active) {
          super._addListener(key, listener)
        } else {
          super._removeListener(key, listener)
        }
      })

      super._addListener(key, listener)
    } else {
      super._addListener(key, fn)
    }
  }

  // @override
  protected _removeListener(key: EventKey<Events>, fn: OpleListener) {
    if (fn.dispose) {
      fn.dispose()
    }
    if (!super._removeListener(key, fn)) {
      const listeners = this.getListeners(key) as Set<OpleListener>
      for (const listener of Array.from(listeners)) {
        if (listener.effect == fn) {
          super._removeListener(key, listener)
          return true
        }
      }
      return false
    }
    return true
  }
}

const proto = Ople.prototype

// Avoid observation of event listeners.
proto.emit = no(proto.emit)

/**
 * Tell the active `Ople` context to update the `effect` associated
 * with the given `owner` object. The `owner` is retained until its
 * `effect` is set to null. The `effect` will be called immediately
 * if the `Ople` context is not disposed.
 */
export function setEffect(owner: object, effect: OpleEffect | null) {
  const ople = no<OpleObject>(expectOple())
  const effects = ople[$effects]
  const prevEffect = effects.get(owner)
  if (prevEffect && effect) {
    throw Error('Cannot overwrite an existing effect')
  }
  const active = !!effect
  if (effect) {
    effects.set(owner, effect)
  } else if (prevEffect) {
    effects.delete(owner)
    effect = prevEffect
  }
  if (!ople[$disposed] && effect) {
    effect(active)
  }
}

/** Restore any effects after being disposed. */
export function restoreEffects(ople: Ople) {
  if (ople[$disposed]) {
    ople[$disposed] = false
    ople[$effects].forEach(effect => effect(true))
  }
}
