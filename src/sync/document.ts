import { DeepFreeze, OpleResult, OpleInput } from '../convert'
import { OpleRef, OpleTime } from '../values'
import { db } from './database'

export interface OpleDocumentOptions {
  credentials?: object
  delegates?: object
  ttl?: OpleTime
}

export type OpleDocumentData<T extends object | null = any> = [T] extends [Any]
  ? Record<string, any>
  : Remap<Omit<T, string & keyof OpleDocument>>

/**
 * A query evaluated to a document.
 *
 * Note: This object doesn't necessarily reflect the current state
 * of `data` or `ts`, except when its own methods are used to
 * mutate those properties.
 */
export class OpleDocument<T extends object | null = any> {
  readonly data: NoInfer<DeepFreeze<OpleResult<T>>>
  constructor(readonly ref: OpleRef<T>, data: any, readonly ts: OpleTime) {
    this.data = data
    return new Proxy(this, docProxy)
  }

  /**
   * Update the document's data and (optionally) its metadata.
   */
  update(data: OpleInput<Partial<T>>, options?: OpleDocumentOptions): this
  /**
   * Update the document's metadata.
   *
   * Passing `null` to data will **not** erase anything.
   */
  update(data: null, options: OpleDocumentOptions): this
  /** @internal */
  update(data: OpleInput<Partial<T>> | null, options?: OpleDocumentOptions) {
    const self = db.update(this.ref, data ? { data, ...options } : options!)
    return Object.assign(this, { data: self.data, ts: self.ts })
  }

  /** Enforces type nominality */
  private _document!: { data: T }
}

// Forward unknown properties to the `data` object.
const docProxy: ProxyHandler<any> = {
  get: (doc, key) => doc[key] || doc.data[key],
}

/** Identify a JSON object as compatible with `OpleDocumentResult` */
export function isDocumentLike(value: Record<string, any>) {
  const keys = Object.keys(value)
  return (
    keys.length == 3 &&
    hasConstructor(value.ref, OpleRef) &&
    hasConstructor(value.ts, OpleTime) &&
    hasConstructor(value.data, Object)
  )
}

function hasConstructor(val: any, ctr: Function) {
  return val.constructor == ctr
}

// https://github.com/microsoft/TypeScript/issues/14829#issuecomment-504042546
type NoInfer<T> = [T][T extends any ? 0 : never]

/** Try to simplify `&` out of an object type */
type Remap<T> = {} & {
  [P in keyof T]: T[P]
}

/** Use `[T] extends [Any]` to know if a type parameter is `any` */
declare class Any {
  private _: never
}
