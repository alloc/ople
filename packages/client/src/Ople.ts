import { $O, no, o, Observable } from 'wana'
import { withOple, expectOple } from './context'
import { OpleEffect, OpleObject } from './types'
import { setHidden } from './common'
import { setState } from './setState'
import { $effects, $disposed } from './symbols'
import { signalTraps } from './Signal'

/** The base class of objects created by `createOple` */
export class Ople {
  protected [$O]: Observable
  protected [$effects]: Map<object, OpleEffect>
  protected [$disposed]: boolean

  constructor() {
    return reviveOple(this)
  }

  /**
   * Use the properties defined in the given `state` object to update
   * this object's values. Like `Object.assign` but with support for
   * memoized getters (via `get` syntax).
   */
  set(state: object) {
    withOple(this, setState, [state])
  }

  /** Disable all effects managed by this object. */
  dispose() {
    if (!this[$disposed]) {
      this[$disposed] = true
      this[$effects].forEach(effect => effect(false))
    }
  }
}

// Bind signals to Ople instances on-demand.
Object.setPrototypeOf(Ople.prototype, new Proxy({}, signalTraps))

export function reviveOple(self: Ople) {
  setHidden(self, $effects, new Map())
  setHidden(self, $disposed, false)
  return o(self)
}

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
