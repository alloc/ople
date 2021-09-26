import { Disposable } from '@alloc/types'
import { withOple, OpleEffect } from './OpleContext'

export function setup<T extends Record<string, any>>(
  init: () => T
): T & Disposable {
  const ople = new Ople<T & Disposable>(init as any)
  ople.exports.dispose = ople.deactivate.bind(ople)
  return ople.exports
}

export class Ople<T extends Record<string, any> | void = any> {
  active: boolean
  effects = new Map<object, OpleEffect>()
  exports: T

  constructor(init: () => T, active = true) {
    this.active = active
    this.exports = withOple(this, init)
  }

  /** Get a bound `deactivate` function to assign somewhere. */
  get dispose() {
    return this.deactivate.bind(this)
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
