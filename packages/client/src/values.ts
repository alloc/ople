import { is } from '@alloc/is'
import type { OpleBackend } from './OpleBackend'

type Data = Record<string, any>

export class OpleCollection<T extends Data = any> {
  constructor(readonly id: string, readonly backend: OpleBackend) {}

  // @ts-ignore
  protected _type: 'OpleCollection' & { data: T }
}

export class OpleRef<T extends Data = any> {
  constructor(readonly id: string, readonly collection: OpleCollection) {}

  get backend() {
    return this.collection.backend
  }

  toString() {
    return this.collection.id + '/' + this.id
  }

  // @ts-ignore
  protected _type: 'OpleRef' & { data: T }
}

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
