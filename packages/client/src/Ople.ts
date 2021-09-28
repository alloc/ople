import { Disposable } from '@alloc/types'
import { withOple, OpleEffect } from './OpleContext'

export function setup<T extends Record<string, any> | void>(
  init: () => T
): T extends void ? Ople<void> : T & Disposable

export function setup(init: () => Record<string, any> | void) {
  const ople = new Ople<any>(init)
  if (ople.exports) {
    const { exports, dispose } = ople
    exports.dispose = dispose
    return exports
  }
  return ople
}

export class Ople<T extends Record<string, any> | void = any> {
  active: boolean
  exports: T
  effects = new Map<object, OpleEffect>()
  disposers?: Map<object, Disposable | Function>
  parent?: Ople

  constructor(init: () => T, active = true) {
    this.active = active
    this.exports = withOple(this, init)
  }

  /**
   * Call this instead of `deactivate` if you never plan on calling
   * `activate` on this object ever again. It ensures any external
   * resources are cleaned up (eg: a DOM listener).
   */
  get dispose() {
    return () => {
      // Disable any active effects.
      this.deactivate()

      const { parent, disposers } = this

      // Detach from any attached Ople contexts.
      if (parent) {
        this.parent = undefined
        parent.effects.delete(this)
        parent.disposers?.delete(this)
      }

      // Dispose any external resources.
      if (disposers) {
        this.disposers = undefined
        disposers.forEach(disposer =>
          isDisposable(disposer) ? disposer.dispose() : disposer()
        )
      }
    }
  }

  activate() {
    if (!this.active) {
      this.active = true
      withOple(this, () => {
        this.effects.forEach(effect => effect(true))
      })
    }
  }

  deactivate() {
    if (this.active) {
      this.active = false
      withOple(this, () => {
        this.effects.forEach(effect => effect(false))
      })
    }
  }
}

function isDisposable(arg: any): arg is { dispose(): void } {
  return typeof arg.dispose == 'function'
}
