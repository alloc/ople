export class OpleRef {
  constructor(readonly id: string, readonly collection?: OpleRef) {}

  get isCollection(): boolean {
    return !this.collection && this.id == 'collections'
  }
}

export class OpleDate {
  /**
   * Equivalent to `Date` in FaunaDB
   *
   * @see https://docs.fauna.com/fauna/current/api/fql/functions/date
   */
  constructor(date: string) {}
}

export type OpleTimeUnit = 'millisecond' | 'nanosecond'

export class OpleTime {
  constructor(time: string | number, unit?: OpleTimeUnit) {}
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
