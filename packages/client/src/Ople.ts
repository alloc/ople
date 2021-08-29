import { withOple, OpleEffect } from './OpleContext'

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
