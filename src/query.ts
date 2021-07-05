import { db } from './db'
import { queryMap } from './queryMap'
import { OpleCollection } from './sync/collection'
import { OpleDocument, OpleDocumentOptions } from './sync/document'
import { OpleFunctions } from './sync/stdlib'
import { OpleRef } from './sync/values'

interface OpleQueries extends OpleFunctions {
  create<T>(
    collection: OpleRef,
    params: { data: T } & OpleDocumentOptions,
  ): OpleDocument<T>

  createCollection<T>(name: string): OpleCollection<T>
}

export type OpleQuery = Record<string, any>

export function makeQuery<T extends keyof OpleQueries>(
  callee: T,
  ...args: Parameters<OpleQueries[T]>
): OpleQuery {
  const query: any = {}
  const params = queryMap[callee]
  for (let i = 0; i < args.length; i++) {
    query[params[i]] = args[i]
  }
  return query
}

export function execQuerySync<T extends keyof OpleQueries>(
  callee: T,
  ...args: Parameters<OpleQueries[T]>
): ReturnType<OpleQueries[T]> {
  const query = makeQuery(callee, ...args)
  const result = db.
}
