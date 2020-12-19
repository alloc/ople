/** For storing disposable effects on an `Ople` object */
export const $effects = Symbol('ople.effects')

/** For tracking whether the `dispose` method has been called */
export const $disposed = Symbol('ople.disposed')

/** For storing an underlying FaunaDB ref */
export const $R = Symbol('ople.ref')

/** For tracking modified keys */
export const $M = Symbol('ople.modified')
