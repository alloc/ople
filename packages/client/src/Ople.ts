import { OpleEffect } from './types'
import { withOple } from './Ople/context'

export class Ople<T extends Record<string, any> | void = any> {
  active = true
  effects = new Map<object, OpleEffect>()
  exports: T

  constructor(init: () => T) {
    this.exports = withOple(this, init)
  }

  activate() {
    if (!this.active) {
      this.active = true
      this.effects.forEach(effect => effect(true))
    }
  }

  deactivate() {
    if (this.active) {
      this.active = false
      this.effects.forEach(effect => effect(false))
    }
  }
}
