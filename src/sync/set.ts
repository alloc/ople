import { makeExpression, OpleExpression } from '../query'
import { queriesByType } from '../queryMap'
import { OpleRef, OpleTime } from '../values'
import type { OpleArrayLike } from './array'
import { wrapCallback } from './callback'
import { OpleCursor, OplePage } from './page'
import { execSync, q } from './transaction'
import { OpleDocument } from './types'

export type OplePagination = {
  ts?: number | OpleTime
  before?: OpleCursor
  after?: OpleCursor
  /** @default 64 */
  size?: number
}

/**
 * A group of tuples, typically representing resources or index terms,
 * that are in a specific order. Sets must be formally materialized
 * before you can access their underlying data.
 */
export class OpleSet<T = any> {
  constructor(protected expr: OpleExpression, protected source?: OpleSet) {}

  paginate(opts: OplePagination = {}): OplePage<T> {
    return q.paginate(this, opts.ts, opts.before, opts.after, opts.size)
  }

  map<U>(map: (value: T) => U): OpleSet<U>
  map<U extends object | null>(map: (value: T) => OpleRef<U>): OpleRefSet<U>
  map(map: (value: T) => any): OpleSet {
    return new OpleRefSet(makeExpression('map', wrapCallback(map), this), this)
  }

  filter(filter: (value: T) => boolean): OpleSet<T>
  filter(filter: (value: T) => boolean): OpleSet {
    return new OpleRefSet(
      makeExpression('filter', wrapCallback(filter), this),
      this,
    )
  }

  first(): T | null {
    return q.get(this)
  }

  reverse() {
    return new OpleSet<T>(makeExpression('reverse', this), this)
  }
}

export interface OpleSet<T> extends OpleArrayLike<T> {
  // TODO: can lambda return anything, or just a set ref?
  join<U>(lambda: (value: T) => U | OpleSet<U>): OpleSet<U>
  join(indexRef: any): OpleSet<any>
  difference(...groups: OpleSet[]): OpleSet<T>
  /** Ensure all elements are unique */
  distinct(): OpleSet<T>
  intersection(...groups: OpleSet[]): OpleSet<T>
  reverse(): OpleSet<T>
  union<U extends OpleSet>(...groups: U[]): OpleSet<T | OpleSetElement<U>>
}

type OpleSetElement<T> = T extends OpleSet<infer U> ? U : never

const proto: any = OpleSet.prototype
queriesByType.array.forEach(callee => {
  if (proto[callee]) return
  proto[callee] = function (this: OpleSet, ...args: any[]) {
    // TODO: create a native function that does this call
    return execSync(callee, this.expr, ...args)
  }
})

export class OpleRefSet<T extends object | null = any> extends OpleSet<
  OpleRef<T>
> {
  constructor(expr: OpleExpression, source?: OpleSet) {
    super(expr, source)
  }

  get documents(): OpleSet<OpleDocument<T>> {
    return new OpleSet(makeExpression('documents', this), this)
  }

  delete() {
    return new OpleSet<OpleDocument<T>>(makeExpression('delete', this), this)
  }
}

export interface OpleRefSet<T extends object | null = any> {
  filter(filter: (value: OpleRef<T>) => boolean): OpleRefSet<T>
}
