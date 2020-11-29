type FaunaRef<T> = {}

export type OplePromise<T> = Promise<T> & (T extends FaunaRef<infer U> ? )
