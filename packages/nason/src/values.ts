import { is } from '@alloc/is'

class OpleRef<T extends object | null = any> extends String {
  constructor(
    readonly id: string,
    readonly collection?: OpleRef,
    readonly database?: OpleRef
  ) {
    super(
      collection == OpleRef.Native.collections ? collection.id + '/' + id : id
    )
  }

  /** This enforces type nominality. */
  protected _ref!: { data: T }

  equals(ref: OpleRef | undefined): boolean {
    return (
      !!ref &&
      this.id == ref.id &&
      (this.collection
        ? this.collection.equals(ref.collection)
        : !ref.collection) &&
      (this.database ? this.database.equals(ref.database) : !ref.database)
    )
  }

  /**
   * Convert an encoded ref into a `Ref` instance.
   */
  static from(encodedRef: string) {
    const [scope, id] = encodedRef.split('/')
    const collection = new OpleRef(scope, OpleRef.Native.collections)
    return id ? new OpleRef(id, collection) : collection
  }

  static Native = {
    collections: new OpleRef('collections'),
  }
}

// Refs are boxed strings.
type Ref<T extends object | null = any> = OpleRef<T> & string

const Ref: {
  new <T extends object | null = any>(id: string, collection?: Ref<T>): Ref<T>
  from: <T extends object | null = any>(encodedRef: string) => Ref<T>
  Native: {
    collections: Ref
  }
} = OpleRef as any

export { Ref as OpleRef }

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

  /** This enforces type nominality. */
  protected _type!: 'OpleTime'
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

  /** This enforces type nominality. */
  protected _type!: 'OpleDate'
}
