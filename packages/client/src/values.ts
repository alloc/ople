import { is } from '@alloc/is'
import type { OpleBackend } from './OpleBackend'

type Data = Record<string, any>

export class OpleRef<T extends Data = any> {
  readonly collection: OpleCollection

  constructor(
    readonly id: string,
    readonly scope: OpleCollection | OpleBackend
  ) {
    // When the `scope` is not a collection, this ref points to a collection.
    this.collection = scope instanceof OpleCollection ? scope : (this as any)
  }

  get backend(): OpleBackend {
    return this.collection.backend
  }

  toString() {
    return this.collection.id + '/' + this.id
  }

  // @ts-ignore
  protected _type: 'OpleRef' & { data: T }
}

export class OpleCollection<T extends Data = any> extends OpleRef<T> {
  constructor(id: string, backend: OpleBackend) {
    super(id, backend)
  }

  get backend() {
    return this.scope as OpleBackend
  }

  toString() {
    return this.id
  }
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
