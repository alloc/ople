import type { OpleArrayLike, OpleIterable } from './array'

export function isOpleSet(value: any): value is OpleSet {
  return value?.constructor === OpleSet
}

/**
 * A group of tuples, typically representing resources or index terms,
 * that are in a specific order. Sets must be formally materialized
 * before you can access their underlying data.
 */
export class OpleSet<T = any> {}

export interface OpleSet<T> extends OpleArrayLike<T> {
  // TODO: can lambda return anything, or just a set ref?
  join<U>(lambda: (value: T) => U | OpleSet<U>): OpleSet<U>
  join(indexRef: any): OpleSet<any>
  difference(...groups: OpleSet[]): OpleSet<T>
  /** Ensure all elements are unique */
  distinct(): OpleSet<T>
  filter(predicate: (value: T) => boolean): OpleSet<T>
  intersection(...groups: OpleSet[]): OpleSet<T>
  reverse(): OpleSet<T>
  union<U extends OpleSet>(...groups: U[]): OpleSet<T | OpleSetElement<U>>
}

type OpleSetElement<T> = T extends OpleSet<infer U> ? U : never
