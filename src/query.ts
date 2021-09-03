import { Snapshot } from './internal/db'
import { jsonReplacer } from './json/replacer'
import { jsonReviver } from './json/reviver'
import { queryMap } from './queryMap'
import {
  OpleCollection,
  OpleCursor,
  OpleDocumentOptions,
  OplePage,
  OpleSet,
} from './sync/types'
import { OpleFunctions } from './sync/stdlib'
import { OpleQueryError, popStackFrames } from './errors'
import { OpleRef, OpleTime } from './values'
import { DeepFreeze, ToQuery } from './convert'

export interface OpleQueries extends OpleFunctions {
  get<T extends object | null>(ref: OpleRef<T>): OpleQuery.Document<T>

  exists(ref: OpleRef): boolean

  create<T extends object | null>(
    collection: OpleRef,
    params: { data: T } & OpleDocumentOptions,
  ): OpleQuery.Document<T>

  createCollection<T extends object | null>(
    params: { name: string } & OpleCollection.Options<T>,
  ): OpleCollection.CreateResult<T>

  replace<T extends object | null>(
    ref: OpleRef<T>,
    params: { data: T },
  ): OpleQuery.Document<T>

  update<T extends object | null>(
    ref: OpleRef<T>,
    params: { data?: Partial<T> } & OpleDocumentOptions,
  ): OpleQuery.Document<T>

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
    const resultStr = snapshot.execSync(query)
    const result = JSON.parse(resultStr, jsonReviver)
    if (result.constructor == OpleQueryError) {
      popStackFrames(result, 6)
      throw result
    }
    return result
  }
}

export namespace OpleQuery {
  /** A document from a query. */
  export declare class Document<T extends object | null = any> {
    ref: OpleRef<T>
    data: DeepFreeze<ToQuery<T>>
    ts: OpleTime

    private _type: 'OpleDocument'
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
