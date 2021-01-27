/** For storing disposable effects on an `Ople` object */
export const $effects = Symbol('ople.effects')

/** For tracking whether the `dispose` method has been called */
export const $disposed = Symbol('ople.disposed')
