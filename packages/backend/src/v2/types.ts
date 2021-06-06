export declare const api: OpleMethods & {
  extend(methods: OpleMethods): void
}

interface OpleMethods {
  [methodName: string]: OpleMethod
}

interface OpleMethod {
  (this: OpleContext, ...args: any[]): any
}

export interface OpleContext {
  userId: string
}

export declare function openDatabase<Schema>(
  name?: string
): OpleDatabase<Schema>

export type OpleDatabase<Schema> = OpleCollections<Schema>

type OpleCollections<Schema> = {
  [P in keyof Schema]: OpleCollection<Schema[P]>
}

/** Extract user data from an `OpleDocument` type */
export type OpleData<T> = Omit<T, keyof OpleDocument>

type Pluck<T, P extends keyof T> = {} & { -readonly [K in P]: T[P] }

export declare function pluck<T, P extends keyof T>(
  data: T,
  ...keys: P[]
): Pluck<T, P>

export declare abstract class OpleDocument {
  private _type: 'OpleDocument'

  /** The unique identifier within its collection. Not globally unique. */
  readonly _id: string
  /** The timestamp of the last modification. */
  readonly _ts: OpleTime
}

export declare abstract class OpleTime {
  private _type: 'OpleTime'
}

export declare abstract class OpleDate {
  private _type: 'OpleDate'
}

// TODO: indexes?
export declare abstract class OpleCollection<T> {
  private _type: 'OpleCollection'
  /**
   * Check if a document exists.
   * @param id The document identifier
   */
  exists(id: string): boolean
  /**
   * Fetch a document, and bail out unless it exists.
   * @param id  The document identifier
   * @returns The document
   */
  get(id: string): OpleDocument & T
  /**
   * Fetch a document in this collection.
   * @param id The document identifier
   * @returns The document (if it exists)
   */
  getIfExists(id: string): (OpleDocument & T) | null
  /**
   * Create a document in this collection.
   * @param data The document data
   * @returns The document identifier
   */
  insert(data: T): string
  delete(id: string): boolean
  filter(
    fn: (doc: OpleDocument & T, id: string) => boolean
  ): OpleArray<OpleDocument & T>
}

type ArrayLike<T> = OpleArray<T> | readonly T[]

export interface OpleArray<T> {
  [i: number]: T

  length: number
  concat(array: ArrayLike<T>): OpleArray<T>
  concat<U>(array: ArrayLike<U>): OpleArray<T | U>
  filter(fn: (value: T, i: number) => boolean): OpleArray<T>
  map<U>(fn: (value: T, i: number) => U): OpleArray<U>
}
