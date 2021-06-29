import { dequal } from 'dequal'
import { notImplemented } from '../errors'
import { makeQuery } from '../query'

const kData = Symbol.for('OpleIterable.data')

// const toArray = (arg: any[] | OpleArray) =>
//   Array.isArray(arg) ? arg : arg[kData]
// const intersects = (needle: any, groups: (any[] | OpleArray)[]) =>
//   groups.some((group) =>
//     toArray(group as any).some((elem) => dequal(needle, elem)),
//   )
// const insertUnique = <T>(vals: T[], candidate: T) => {
//   if (!vals.some((val) => dequal(candidate, val))) {
//     vals.push(candidate)
//   }
//   return vals
// }
// const distinct = <T>(vals: T[]) => {
//   const uniques: T[] = []
//   for (const val of vals) {
//     insertUnique(uniques, val)
//   }
//   return uniques
// }
// union<U extends any[] | OpleArray>(
//   ...groups: U[]
// ): OpleArray<T | OpleArrayElement<U>> {
//   const vals = [...this[kData]]
//   for (const group of groups) {
//     for (const val of toArray(group)) {
//       insertUnique(vals, val)
//     }
//   }
//   return new OpleArray(vals)
// }
// mean(): [T] extends [number] ? number : never {
//   return (this.sum() / this[kData].length) as any
// }
// sum(): [T] extends [number] ? number : never {
//   let sum = 0
//   for (const val of this[kData]) {
//     if (typeof val !== 'number') {
//       throw Error('Array must contain numbers only')
//     }
//     sum += val
//   }
//   return sum as any
// }
// toObject(): OpleArrayToObject<T> {
//   const obj: Record<string, any> = {}
//   for (let val of this[kData] as any[]) {
//     // unwrap nested OpleArray
//     if (val && kData in val) {
//       val = val[kData]
//     }
//     // data must be in [string, any] form
//     if (!Array.isArray(val) || val.length < 2 || typeof val[0] !== 'string') {
//       throw Error('Array cannot be converted to object')
//     }
//     obj[val[0]] = val[1]
//   }
//   return obj as any
// }

type OpleArrayElement<T> = T extends Array<infer U>
  ? U
  : T extends OpleArray<infer U>
  ? U
  : never

type OpleArrayToObject<T> = [T] extends [readonly [string, infer U]]
  ? Record<string, U>
  : never

export class OpleArray<T = any> implements OpleArrayLike<T> {
  protected [kData]: T[]
  constructor(data: T[]) {
    this[kData] = data
  }
  filter(predicate: (value: T) => boolean) {
    return new OpleArray(this[kData].filter(predicate))
  }
  forEach(iterator: (value: T) => void): void {
    this[kData].forEach(iterator)
  }
  map<U>(mapper: (value: T) => U): OpleArray<U> {
    return new OpleArray(this[kData].map(mapper))
  }
  //
  // OpleArrayLike
  //
  reduce<U>(reducer: (acc: U, value: T) => U, initial: U): U {
    return this[kData].reduce(reducer, initial)
  }
}

export interface OpleArray<T> extends OpleArrayLike<T> {
  append<U>(value: U | U[]): OpleArray<T | U>
  count(): number
  difference(...groups: (any[] | OpleArray)[]): OpleArray<T>
  distinct(): OpleArray<T>
  drop(count: number): OpleArray<T>
  intersection(...groups: (any[] | OpleArray)[]): OpleArray<T>
  isEmpty(): boolean
  isNonEmpty(): boolean
  mean(): [T] extends [number] ? number : never
  prepend<U>(value: U | U[]): OpleArray<T | U>
  reverse(): OpleArray<T>
  select(index: number): T | undefined
  select<U>(index: number, fallback: U): T | U
  sum(): [T] extends [number] ? number : never
  take(count: number): OpleArray<T>
  toObject(): OpleArrayToObject<T>
  union<U extends any[] | OpleArray>(
    ...groups: U[]
  ): OpleArray<T | OpleArrayElement<U>>
}

/** Arrays, Pages, and Sets have these methods */
export interface OpleArrayLike<T = any> {
  /** Returns true when all elements are true */
  all(): boolean
  /** Returns true when any element is true */
  any(): boolean
  count(): number
  isEmpty(): boolean
  isNonEmpty(): boolean
  mean(): [T] extends [number] ? number : never
  reduce<U>(reducer: (acc: U, value: T) => U, initial: U): U
  sum(): [T] extends [number] ? number : never
}
