export interface AnyProps {
  [key: string]: any
}

declare type RefData<T> = T extends Ref<infer U> ? U : any

/** `T` is the ref-level data */
export abstract class Ref<T extends object = AnyProps> {
  readonly id: string
  readonly collection: Collection
  readonly database?: Database
  readonly data: T
  readonly ts: number

  replace(data: T): void

  delete(): void
}

/** `T` is the document-level data */
export type Document<T extends object = AnyProps> = T &
  NominalType<'Document'> &
  Ref<T> & {
    update(params: {
      data?: Partial<T>
      credentials?: Permissions
      delegates?: Ref[]
    }): void

    login<T extends object>(params: {
      password: string
      data?: T
      ttl?: number | FaunaTime
    }): Token<T>
  }

/**
 * `T` is the binding-level data,
 * `U` is the index-level data
 */
export type Index<T = any, U extends object = AnyProps> = U &
  NominalType<'Index', T> &
  Ref<U> & {
    name: string
    unique: boolean
    serialized: boolean
    permissions?: Permissions
    readonly terms?: any[]
    readonly values?: any[]
    readonly source: Collection
    readonly active: boolean
    readonly partitions: number
  }

/**
 * `T` is the document-level type,
 * `U` is the collection-level data
 */
export type Collection<
  T extends object = AnyProps,
  U extends object = AnyProps
> = U &
  NominalType<'Collection'> &
  Ref<U> & {
    readonly name: string
    history_days: number

    get(id: string): Document<T>

    add(params: {
      data: T
      credentials?: Permissions
      delegates?: Ref[]
      ttl?: number | FaunaTime
    }): Document<T>
  }

/** `T` is the database-level data */
export type Database<T extends object = AnyProps> = T &
  NominalType<'Database'> &
  Ref<T> & {
    readonly name: string
  }

/** `T` is the function-level data */
export type Function<T extends object = AnyProps> = T &
  NominalType<'Function'> &
  Ref<T> & {
    readonly name: string
    readonly body: Lambda

    call(...args: any[]): any
  }

export abstract class Cursor<T = any> extends NominalType<'Cursor', T> {}

export abstract class Page<T = any> {
  data: T[]
  after: Cursor<T>
  before: Cursor<T>
}

export abstract class SetRef<T = any> extends NominalType<'SetRef', T> {
  paginate(): Page<T>
}

/** `T` is the token-level data */
export type Token<T extends object = AnyProps> = T &
  Ref<T> & {
    readonly secret: string
    readonly document: Ref
  }

export abstract class Role extends NominalType<'Role'> {}

export abstract class Permissions extends NominalType<'Permissions'> {}

/** A set of FQL statements with deferred evaluation */
export abstract class Lambda extends NominalType<'Lambda'> {}

export abstract class Bytes extends NominalType<'Bytes'> {}

/** An instant in time expressed as a calendar date and time of day in UTC. */
export abstract class FaunaTime extends NominalType<'Time'> {
  readonly date: FaunaDate
}

/** A calendar date with no associated time zone. */
export abstract class FaunaDate extends NominalType<'Date'> {
  readonly dayOfMonth: FaunaTime
}

declare abstract class NominalType<Name extends string, Data = any> {
  /** This enforces type nominality. */
  protected _type: { name: Name; data: Data }
}

/** Every built-in query */
export interface NativeQueries extends RefQueries, IsQueries {
  /** Encapsulate a set of FQL statements in a `Lambda` expression */
  Lambda(fn: (...args: any[]) => any): Lambda

  /** Converts an ISO-8601 string (or `"now"`) into a `FaunaTime`. */
  Time(str: string): FaunaTime

  /** Converts an ISO-8601 string into a `FaunaDate`. */
  Date(str: string): FaunaDate

  NewId(): string
}

declare interface RefQueries {
  Ref<T extends object = AnyProps>(
    id: string,
    collection?: Collection<T>,
    database?: Database
  ): Ref<T>

  Database<T extends object = AnyProps>(name: string): Database<T>

  Collection<T extends object = AnyProps, U extends object = AnyProps>(
    name: string
  ): Collection<T, U>

  Function<T extends object = AnyProps>(name: string): Function<T>

  Databases(database?: Database): SetRef<Database>

  Collections(database?: Database): SetRef<Collection>

  Functions(database?: Database): SetRef<Function>

  Documents<T extends object = AnyProps>(
    collection?: Collection<T>
  ): SetRef<Document<T>>
}

declare interface IsQueries {
  /** Tests whether a value is an array. */
  IsArray(value: any): value is any[]

  /** Tests whether a value is a boolean. */
  IsBoolean(value: any): value is boolean

  /** Tests whether a value is a group of bytes. */
  IsBytes(value: any): value is Bytes

  /** Tests whether a value is a collection ref. */
  IsCollection(value: any): value is Collection

  /** Tests whether a value is a credentials object. */
  IsCredentials(value: any): value is object

  /** Tests whether a value is a database ref. */
  IsDatabase(value: any): value is Database

  /** Tests whether a value is a Date. */
  IsDate(value: any): value is FaunaDate

  /** Tests whether a value is a reference to an existing document. */
  IsDoc(value: any): value is Ref

  /** Tests whether a value is a double-precision, floating point number. */
  IsDouble(value: any): value is number

  /** Tests whether a value is a function. */
  IsFunction(value: any): value is Function

  /** Tests whether a value is an index ref. */
  IsIndex(value: any): value is Index

  /** Tests whether a value is an integer number. */
  IsInteger(value: any): value is number

  /** Tests whether a value is a key ref. */
  // IsKey(value: any): value is boolean

  /** Tests whether a value is a Lambda function. */
  IsLambda(value: any): value is Lambda

  /** Tests whether a value is null. */
  IsNull(value: any): value is null

  /** Tests whether a value is numeric, which includes integers and doubles. */
  IsNumber(value: any): value is number

  /** Tests whether a value is an object. */
  IsObject(value: any): value is object

  /** Tests whether a value is a reference. */
  IsRef(value: any): value is Ref

  /** Tests whether a value is a role. */
  IsRole(value: any): value is Role

  /** Tests whether a value is a set. */
  IsSet(value: any): value is SetRef

  /** Tests whether a value is a string. */
  IsString(value: any): value is string

  /** Tests whether a value is a timestamp. */
  IsTimestamp(value: any): value is FaunaTime

  /** Tests whether a value is a token ref. */
  IsToken(value: any): value is Token
}