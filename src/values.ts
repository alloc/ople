import { notImplemented } from './errors'
import { q } from './sync/transaction'

export class OpleRef<T extends object | null = any> {
  constructor(readonly id: string, readonly collection?: OpleRef) {}

  get exists(): boolean {
    return q.exists(this)
  }

  get isCollection(): boolean {
    return this.collection?.id == 'collections'
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

  toString() {
    throw notImplemented
  }

  /** This enforces type nominality. */
  protected _type!: 'OpleDate'
}

export type OpleTimeUnit = 'millisecond' | 'nanosecond'

export class OpleTime {
  constructor(time: string | number, unit?: OpleTimeUnit) {}

  toString() {
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
