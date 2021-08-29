import { is } from '@alloc/is'
import { Disposable } from '@alloc/types'
import { Ople } from '../Ople'
import { OpleEffect, setEffect } from '../OpleContext'

/**
 * Disposable maps are useful for setting an `Ople` effect
 * without managing a variable for each owner.
 *
 * When `set` is called, an effect is attached which creates
 * a `Disposable` instance (when the owner is active) and disposes
 * that instance (when the owner is disposed).
 *
 * When `unset` is called, the effect attached by `set` is detached
 * from the owner forever, and the `Disposable` instance is disposed
 * if necessary.
 */
export function makeDisposableMap() {
  const effects = new WeakMap<Ople, OpleEffect>()
  return {
    has: (owner: Ople) => effects.has(owner),
    set(owner: Ople, init: () => Disposable | (() => void)) {
      let instance: Disposable | (() => void) | null = null
      function effect(active: boolean) {
        if (active) {
          instance = init()
        } else {
          is.function(instance) ? instance() : instance!.dispose()
          instance = null
        }
      }

      setEffect(effect, effect, owner)
      effects.set(owner, effect)
    },
    unset(owner: Ople) {
      const effect = effects.get(owner)
      effect && setEffect(effect, null, owner)
    },
  }
}
