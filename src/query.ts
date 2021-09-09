import { Snapshot } from './internal/db'
import { queryMap } from './queryMap'
import { OpleCallback } from './sync/callback'
import { OpleFunctions } from './sync/stdlib'
import {
  OpleCollection,
  OpleCursor,
  OpleDocument,
  OplePage,
  OpleRef,
  OpleSet,
  OpleTime,
} from './sync/types'
import { OpleQueryError, popStackFrames } from './errors'
import { OpleJSON } from './json'
import { OpleInput } from './convert'

// Note: The parameter names *need* to match what FaunaDB expects
// (except the first parameter, as the method name is used instead).
// For guidance, see https://github.com/fauna/faunadb-js/blob/main/src/query.js
export interface OpleQueries extends OpleFunctions {
  get<T extends OpleRef>(
    ref: T,
  ): T extends OpleRef<infer U> ? OpleDocument<U> : never

  get<T extends OpleSet>(
    set: T,
  ): (T extends OpleSet<infer U> ? U : never) | null

  exists(ref: OpleRef): boolean

  create<T extends object | null>(
    collection: OpleRef,
    params: { data: T } & OpleDocument.Options,
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
    params: { data?: OpleInput<Partial<T>> } & OpleDocument.Options,
  ): OpleDocument<T>

  paginate<T>(
    set: OpleSet,
    ts?: number | OpleTime,
    before?: OpleCursor,
    after?: OpleCursor,
    size?: number,
  ): OplePage<T>

  filter(filter: OpleCallback, collection: OpleSet): OpleSet

  map(map: OpleCallback, collection: OpleSet): OpleSet

  reverse(values: OpleSet): OpleSet

  createIndex(params: {
    name: string
    source: OpleRef
    collate: OpleCallback
  }): void
}

export class OpleQuery {
  constructor(readonly expr: OpleExpression) {}

  toString() {
    return OpleJSON.stringify(this.expr)
  }

  execSync(snapshot: Snapshot) {
    const callbacks: Record<string, Function> = {}
    const query = JSON.stringify(this.expr, (key, value) => {
      if (value && value.constructor == OpleCallback) {
        callbacks[value.id] = value.invoke
      }
      return OpleJSON.replace(key, value)
    })
    const resultStr = snapshot.execSync(query, callbacks)
    const result = OpleJSON.parse(resultStr)
    if (result && result.constructor == OpleQueryError) {
      popStackFrames(result, 6)
      throw result
    }
    return result
  }
}

export function makeQuery<T extends string>(
  callee: T,
  ...args: T extends keyof OpleQueries ? Parameters<OpleQueries[T]> : any[]
): OpleQuery {
  return new OpleQuery(makeExpression(callee, ...args))
}

export type OpleExpression = Readonly<Record<string, any>>

export function makeExpression<T extends string>(
  callee: T,
  ...args: T extends keyof OpleQueries ? Parameters<OpleQueries[T]> : any[]
): OpleExpression {
  const expr: { [key: string]: any } = {}
  const params = queryMap[callee]
  for (let i = 0; i < args.length; i++) {
    expr[params[i]] = args[i]
  }
  return expr
}
