import { Snapshot } from './internal/db'
import { jsonReplacer } from './json/replacer'
import { jsonReviver } from './json/reviver'
import { queryMap } from './queryMap'
import { OpleCollection } from './sync/collection'
import { OpleDocument, OpleDocumentOptions } from './sync/document'
import { OpleFunctions } from './sync/stdlib'
import { OpleQueryError, OpleRef } from './values'

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
