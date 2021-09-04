import { DeepFreeze, OpleResult, OpleInput } from '../convert'
import { OpleRef, OpleTime } from '../values'
import { db } from './database'

export interface OpleDocument<T extends object | null = any> {
  ref: OpleRef<T>
  data: T
  ts: OpleTime
}

/**
 * A query evaluated to a document.
 *
 * Note: This object doesn't necessarily reflect the current state
 * of `data` or `ts`, except when its own methods are used to
 * mutate those properties.
 */
class OpleDocumentResult<T extends object | null = any> {
  constructor(
    readonly ref: OpleRef<T>,
    readonly data: DeepFreeze<OpleResult<T>>,
    readonly ts: OpleTime,
  ) {
    return new Proxy(this, {
      get: (_, key: keyof this & string) =>
        this[key] || (this.data as any)[key],
    })
  }

  /**
   * Update the document's data and (optionally) its metadata.
   */
  update(data: OpleInput<Partial<T>>, options?: OpleDocument.Options): this
  /**
   * Update the document's metadata.
   *
   * Passing `null` to data will **not** erase anything.
   */
  update(data: null, options: OpleDocument.Options): this
  /** @internal */
  update(data: OpleInput<Partial<T>> | null, options?: OpleDocument.Options) {
    const self = db.update(this.ref, data ? { data, ...options } : options!)
    return Object.assign(this, { data: self.data, ts: self.ts })
  }

  /** Enforces type nominality */
  private _document!: { data: T }
}

export namespace OpleDocument {
  export const Result = OpleDocumentResult
  export type Result<T extends object | null = any> = OpleDocumentResult<T> &
    Omit<T, keyof OpleDocumentResult>

  export interface Options {
    credentials?: object
    delegates?: object
    ttl?: OpleTime
  }
}

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
