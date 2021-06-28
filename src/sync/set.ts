import { OpleArrayLike } from './array'

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
}
