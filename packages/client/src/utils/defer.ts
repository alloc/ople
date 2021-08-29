export type PromiseResolver<T> =
  | ([T] extends [void] ? never : (value: T | PromiseLike<T>) => void)
  | ([void] extends [T] ? (value?: PromiseLike<void>) => void : never)

export interface Deferred<T> extends PromiseLike<T> {
  resolve: PromiseResolver<T>
  reject(error: any): void
}

export function defer<T>(): Deferred<T> {
  const deferred = {} as Deferred<T>
  const promise = new Promise<T>((resolve, reject) => {
    deferred.resolve = resolve as PromiseResolver<T>
    deferred.reject = reject
  })
  deferred.then = promise.then.bind(promise)
  return deferred
}
