import { $O, o, Observable } from 'wana'
import { expectOple } from './context'
import { OpleEffect } from './types'
import { setHidden } from './common'
import { setState } from './setState'
import { $effects, $disposed } from './symbols'
import { signalTraps } from './Signal'

export abstract class ReadonlyOple {
  protected [$O]: Observable
  protected [$effects]: Map<object, OpleEffect>
  protected [$disposed]: boolean

  constructor() {
    setHidden(this, $effects, new Map())
    setHidden(this, $disposed, false)
    return o(this)
  }

  abstract dispose(): void
}

export class Ople extends ReadonlyOple {
  /**
   * Use the properties defined in the given `state` object to update
   * this object's values. Like `Object.assign` but with support for
   * memoized getters (via `get` syntax).
   */
  set(state: object) {
    setState(state, this as any)
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

/**
 * Tell the active `Ople` context to update the `effect` associated
 * with the given `owner` object. The `owner` is retained until its
 * `effect` is set to null. The `effect` will be called immediately
 * if the `Ople` context is not disposed.
 */
export function setEffect(
  owner: object,
  effect: OpleEffect | null,
  context: Ople = expectOple()
) {
  const effects = context[$effects]
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
  if (!context[$disposed] && effect) {
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
