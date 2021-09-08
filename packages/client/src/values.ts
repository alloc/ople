import { is } from '@alloc/is'

export class OpleTime {
  readonly isoTime: string

  constructor(value: string | Date) {
    if (is.date(value)) {
      value = value.toISOString()
    } else if (value.slice(-1) != 'Z') {
      throw Error(`Expected timezone "Z" but got "${value}"`)
    }
    this.isoTime = value
  }

  /** Create a `Date` object using `this.isoTime`, thereby **losing nanosecond precision.** */
  get date() {
    return new Date(this.isoTime)
  }

  // @ts-ignore
  protected _type: 'OpleTime'
}

export class OpleDate {
  readonly isoDate: string

  constructor(value: string | Date) {
    if (is.date(value)) {
      // Extract the "YYYY-MM-DD" part.
      value = value.toISOString().slice(0, 10)
    }
    this.isoDate = value
  }

  get date() {
    return new Date(this.isoDate)
  }

  // @ts-ignore
  protected _type: 'OpleDate'
}
