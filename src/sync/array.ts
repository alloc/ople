import util from 'util'
import { OpleResult } from '../convert'
import { queriesByType } from '../queryMap'
import { execSync } from './transaction'

const { filter, forEach, map, reduce, slice } = getArrayFunctions(
  Array.prototype,
)

export class OpleArray<T> {
  constructor(data: readonly T[]) {
    Object.setPrototypeOf(data, OpleArray.prototype)
    return new Proxy(data, OpleArray.traps) as any
  }
  static traps = <ProxyHandler<readonly any[]>>{
    get(array, key: keyof typeof array | typeof util.inspect.custom) {
      return key === util.inspect.custom ? slice(array) : array[key]
    },
  }
  filter(predicate: (value: T) => boolean) {
    return new OpleArray(filter(this, predicate))
  }
  forEach(iterator: (value: T) => void) {
    forEach(this, iterator)
  }
  map<U>(mapper: (value: T) => U) {
    return new OpleArray(map(this, mapper) as U[])
  }
  select<U>(index: number, fallback: U): OpleResult<T | U>
  select(index: number): OpleResult<T> | undefined
  select(index: number, fallback?: any) {
    return index >= 0 && index < this.length ? this[index] : fallback
  }
  //
  // OpleArrayLike
  //
  reduce<U>(reducer: (acc: U, value: T) => U, initial: U) {
    return reduce(this, reducer as any, initial) as OpleResult<U>
  }
}

export interface OpleArray<T = any> extends OpleArrayLike<T> {
  readonly [index: number]: OpleResult<T>
  append<U>(value: U | U[]): OpleArray<T | U>
  difference(...groups: (any[] | OpleArray)[]): OpleArray<T>
  distinct(): OpleArray<T>
  drop(count: number): OpleArray<T>
  intersection(...groups: (any[] | OpleArray)[]): OpleArray<T>
  isEmpty(): boolean
  isNonEmpty(): boolean
  prepend<U>(value: U | U[]): OpleArray<T | U>
  reverse(): OpleArray<T>
  take(count: number): OpleArray<T>
  toObject(): OpleArrayToObject<T>
  union<U extends any[] | OpleArray>(
    ...groups: U[]
  ): OpleArray<T | OpleArrayElement<U>>
}

Object.setPrototypeOf(OpleArray.prototype, Array.prototype)

type OpleArrayElement<T> = T extends Array<infer U>
  ? U
  : T extends OpleArray<infer U>
  ? U
  : never

type OpleArrayToObject<T> = [T] extends [readonly [string, infer U]]
  ? Record<string, OpleResult<U>>
  : never

const proto: any = OpleArray.prototype
queriesByType.array.forEach(callee => {
  if (proto[callee]) return
  proto[callee] = function (this: OpleArray, ...args: any[]) {
    // TODO: create a native function that does this call
    return execSync(callee, this, ...args)
  }
})

/** Arrays, Pages, and Sets have these methods */
export interface OpleArrayLike<T = any> {
  /** Returns true when all elements are true */
  all(): boolean
  /** Returns true when any element is true */
  any(): boolean
  isEmpty(): boolean
  isNonEmpty(): boolean
  readonly length: number
  mean(): [T] extends [number] ? number : never
  reduce<U>(reducer: (acc: U, value: T) => U, initial: U): OpleResult<U>
  sum(): [T] extends [number] ? number : never
}

type ArrayFunctions<T> = {
  [P in Extract<keyof T, string>]: T[P] extends (
    ...args: infer Args
  ) => infer Return
    ? (...args: [any, ...Args]) => Return
    : never
}

function getArrayFunctions<T extends object>(methods: T): ArrayFunctions<T> {
  const funcs: any = {}
  for (const name of Object.getOwnPropertyNames(methods)) {
    const desc = Object.getOwnPropertyDescriptor(methods, name)!
    if (typeof desc.value == 'function') {
      funcs[name] = Function.call.bind(desc.value)
    }
  }
  return funcs
}
