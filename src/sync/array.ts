export interface OpleArray<T> extends OpleArrayLike<T>, OpleIterable<T> {
  append<U>(...values: U[]): OpleArray<T | U>
  append<U>(values: readonly U[]): OpleArray<T | U>
  append<U>(values: OpleArrayLike<U>): OpleArray<T | U>
  drop(count: number): this
  prepend<U>(...values: U[]): OpleArray<T | U>
  prepend<U>(values: readonly U[]): OpleArray<T | U>
  prepend<U>(values: OpleArrayLike<U>): OpleArray<T | U>
  select(index: number): T | undefined
  select<U>(index: number, fallback: U): T | U
  take(count: number): this
  toObject: T extends [string, infer U] ? () => Record<string, U> : never
}

/** Arrays, Pages, and Sets have these methods */
export interface OpleArrayLike<T = any> {
  /** Returns true when all elements are true */
  all(): boolean
  /** Returns true when any element is true */
  any(): boolean
  count(): number
  difference(...groups: OpleArrayLike[]): this
  /** Ensure all elements are unique */
  distinct(): this
  filter(predicate: (value: T) => boolean): this
  intersection(...groups: OpleArrayLike[]): this
  isEmpty(): boolean
  isNonEmpty(): boolean
  mean: T extends number ? () => number : never
  reduce<U>(reducer: (acc: U, value: T) => U, initial: U): U
  reverse(): this
  sum: T extends number ? () => number : never
  union(...groups: OpleArrayLike<T>[]): this
}

/** Arrays and Pages have these methods */
export interface OpleIterable<T> {
  forEach(iterator: (value: T) => void): void
  map<U>(mapper: (value: T) => U): OpleArray<U>
}
