import { makeExpression, makeQuery, OpleExpression } from '../query'
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

  get documents(): T extends OpleRef<infer U>
    ? OpleSet<OpleDocument<U>>
    : never {
    return new OpleSet(makeExpression('documents', this), this) as any
  }

  paginate(opts: OplePagination = {}): OplePage<T> {
    return q.paginate(this, opts.ts, opts.before, opts.after, opts.size)
  }

  map<U>(map: (value: T) => U): OpleSet<U> {
    return new OpleSet(makeExpression('map', wrapCallback(map), this), this)
  }

  filter(filter: (value: T) => boolean): OpleSet<T> {
    return new OpleSet(
      makeExpression('filter', wrapCallback(filter), this),
      this,
    )
  }

  first(): T | null {
    return q.get(this)
  }

  reverse() {
    return new OpleSet(makeExpression('reverse', this), this)
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
