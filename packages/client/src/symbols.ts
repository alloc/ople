/** For storing disposable effects on an `Ople` object */
export const $effects = Symbol('ople.effects')

/** For tracking whether the `dispose` method has been called */
export const $disposed = Symbol('ople.disposed')

/** For storing an underlying FaunaDB ref */
export const $R = Symbol('ople:ref')

/** For storing the unsaved patch queue */
export const $P = Symbol('ople:patches')
