import { Snapshot } from './internal/db'
import { jsonReplacer } from './json/replacer'
import { jsonReviver } from './json/reviver'
import { queryMap } from './queryMap'
import { OpleCollection, OpleCollectionOptions } from './sync/collection'
import { OpleDocument, OpleDocumentOptions } from './sync/document'
import { OpleFunctions } from './sync/stdlib'
import { OpleRef } from './values'

export interface OpleQueries extends OpleFunctions {
  get(ref: OpleRef): OpleDocument

  create<T>(
    collection: OpleRef,
    params: { data: T } & OpleDocumentOptions,
  ): OpleDocument<T>

  createCollection<T>(
    params: { name: string } & OpleCollectionOptions,
  ): OpleCollection<T>
}

export class OpleQuery {
  constructor(readonly expr: { readonly [key: string]: any }) {}
  toString() {
    return JSON.stringify(this.expr, jsonReplacer)
  }
  execSync(snapshot: Snapshot) {
    const result = snapshot.execSync(this.toString())
    return JSON.parse(result, jsonReviver)
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
