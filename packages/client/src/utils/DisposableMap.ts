import { OpleEffect } from '../types'
import { Ople, setEffect } from '../Ople'
import { withOple } from '../context'

interface Disposable {
  dispose(): void
}

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
    set(owner: Ople, init: () => Disposable) {
      let instance: Disposable

      const effect: OpleEffect = active =>
        active ? (instance = init()) : instance.dispose()

      effects.set(owner, effect)
      withOple(owner, () => setEffect(effect, effect))
    },
    unset(owner: Ople) {
      const effect = effects.get(owner)
      effect && withOple(owner, () => setEffect(effect, null))
    },
  }
}
