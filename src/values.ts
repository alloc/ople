import { OpleInput } from './convert'
import { notImplemented } from './errors'
import { OpleDocument } from './sync/types'
import { q } from './sync/transaction'

export class OpleRef<T extends object | null = any> {
  constructor(readonly id: string, readonly collection?: OpleRef) {}

  get exists(): boolean {
    return q.exists(this)
  }

  get isCollection(): boolean {
    return this.collection?.id == 'collections'
  }

  equals(ref: any): boolean {
    return (
      Boolean(ref) &&
      ref.id == this.id &&
      (this.collection
        ? this.collection.equals(ref.collection)
        : !ref.collection)
    )
  }

  /**
   * Update the document's data and (optionally) its metadata.
   */
  update(
    data: OpleInput<Partial<T>>,
    options?: OpleDocument.Options,
  ): OpleDocument<T>
  /**
   * Update the document's metadata.
   *
   * Passing `null` to data will **not** erase anything.
   */
  update(data: null, options: OpleDocument.Options): OpleDocument<T>
  /** @internal */
  update(data: OpleInput<Partial<T>> | null, options?: OpleDocument.Options) {
    return q.update(this, data ? { data, ...options } : options!)
  }

  toString() {
    const { id, collection } = this
    return collection
      ? collection !== OpleRef.Native.collections
        ? collection.id + '/' + id
        : id
      : '@' + id
  }

  static from(encodedRef: string) {
    const [scope, id] = encodedRef.split('/')
    const collection = new OpleRef(scope, OpleRef.Native.collections)
    return id ? new OpleRef(id, collection) : collection
  }

  static Native = {
    collections: new OpleRef('collections'),
  }

  /** This enforces type nominality. */
  protected _ref!: { data: T }
}

export class OpleDate {
  /**
   * Equivalent to `Date` in FaunaDB
   *
   * @see https://docs.fauna.com/fauna/current/api/fql/functions/date
   */
  constructor(date: string) {}

  toString(): string {
    throw notImplemented
  }

  /** This enforces type nominality. */
  protected _type!: 'OpleDate'
}

export type OpleTimeUnit = 'millisecond' | 'nanosecond'

export class OpleTime {
  constructor(time: string | number, unit?: OpleTimeUnit) {}

  toString(): string {
    throw notImplemented
  }

  protected _type!: 'OpleTime'
}

export interface OpleDate {
  add(days: number): OpleDate
  diff(finish: OpleDate): OpleDate
  subtract(days: number): OpleDate
}

export interface OpleTime {
  /**
   * Equivalent to `Time` in FaunaDB
   *
   * @see https://docs.fauna.com/fauna/current/api/fql/functions/time
   */
  constructor(time: string): OpleTime
  /**
   * Equivalent to `Epoch` in FaunaDB
   *
   * @see https://docs.fauna.com/fauna/current/api/fql/functions/epoch
   */
  constructor(time: number, unit: OpleTimeUnit): OpleTime

  readonly dayOfMonth: number
  readonly dayOfWeek: number
  readonly dayOfYear: number
  readonly hour: number
  readonly minute: number
  readonly month: number
  readonly second: number
  readonly year: number

  add(offset: number, unit: OpleTimeUnit): OpleTime
  diff(finish: OpleTime, unit: OpleTimeUnit): OpleTime
  subtract(offset: number, unit: OpleTimeUnit): OpleTime
}
