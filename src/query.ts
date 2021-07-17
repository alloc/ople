import { Snapshot } from './internal/db'
import { jsonReplacer } from './json/replacer'
import { jsonReviver } from './json/reviver'
import { queryMap } from './queryMap'
import { OpleCollection } from './sync/collection'
import { OpleDocument, OpleDocumentOptions } from './sync/document'
import { OpleFunctions } from './sync/stdlib'
import { OpleQueryError, popStackFrames } from './errors'
import { OpleDate, OpleRef, OpleTime } from './values'
import { OpleCursor, OplePage } from './sync/page'
import { OpleArray } from './sync/array'
import { OpleSet } from './sync/set'

export type ToQuery<T> = T extends ReadonlyArray<infer U>
  ? OpleArray<U>
  : T extends object
  ? T extends OpleDocument<infer U>
    ? OpleDocument<ToQuery<U>, U>
    : T extends
        | OpleRef
        | OpleCollection
        | OpleTime
        | OpleDate
        | OpleSet
        | OpleCursor
        | OplePage
    ? T
    : { [P in keyof T]: ToQuery<T[P]> }
  : T

export type FromQuery<T> = T extends OpleArray<infer U>
  ? FromQuery<U>[]
  : T extends object
  ? T extends OplePage<infer U>
    ? { data: FromQuery<U>[]; before?: OpleCursor; after?: OpleCursor }
    : T extends OpleDocument<any, infer U>
    ? { ref: OpleRef<U>; data: U; ts: OpleTime }
    : T extends OpleCollection<any, infer U>
    ? OpleRef<U>
    : T extends OpleRef | OpleTime | OpleDate | OpleSet | OpleCursor
    ? T
    : { [P in keyof T]: FromQuery<T[P]> }
  : T

export interface OpleQueries extends OpleFunctions {
  get<T extends object | null>(ref: OpleRef<T>): OpleDocument<T>

  exists(ref: OpleRef): boolean

  create<T extends object | null>(
    collection: OpleRef,
    params: { data: T } & OpleDocumentOptions,
  ): OpleDocument<T>

  createCollection<T extends object | null>(
    params: { name: string } & OpleCollection.Options<T>,
  ): OpleCollection.CreateResult<T>

  replace<T extends object | null>(
    ref: OpleRef<T>,
    params: { data: T },
  ): OpleDocument<T>

  update<T extends object | null>(
    ref: OpleRef<T>,
    params: { data?: Partial<T> } & OpleDocumentOptions,
  ): OpleDocument<T>

  paginate<T>(
    set: OpleSet,
    ts?: number | OpleTime,
    before?: OpleCursor,
    after?: OpleCursor,
    size?: number,
  ): OplePage<T>
}

export class OpleQuery {
  constructor(readonly expr: { readonly [key: string]: any }) {}
  toString() {
    return JSON.stringify(this.expr, jsonReplacer)
  }
  execSync(snapshot: Snapshot) {
    const query = this.toString()
    console.log('execSync:', query)
    const resultStr = snapshot.execSync(query)
    const result = JSON.parse(resultStr, jsonReviver)
    if (result.constructor == OpleQueryError) {
      popStackFrames(result, 6)
      throw result
    }
    return result
  }
}

export function makeQuery<T extends keyof OpleQueries>(
  callee: T,
  ...args: Parameters<OpleQueries[T]>
): OpleQuery
export function makeQuery(callee: string, ...args: any[]): OpleQuery
export function makeQuery(callee: string, ...args: any[]) {
  const expr: { [key: string]: any } = {}
  const params = queryMap[callee]
  for (let i = 0; i < args.length; i++) {
    expr[params[i]] = args[i]
  }
  return new OpleQuery(expr)
}
