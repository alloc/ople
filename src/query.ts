import { Snapshot } from './internal/db'
import { queryMap } from './queryMap'
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

export interface OpleQueries extends OpleFunctions {
  get<T extends OpleRef>(
    ref: T,
  ): T extends OpleRef<infer U> ? OpleDocument<U> : never

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
}

export class OpleQuery {
  constructor(readonly expr: { readonly [key: string]: any }) {}
  toString() {
    return OpleJSON.stringify(this.expr)
  }
  execSync(snapshot: Snapshot) {
    const query = this.toString()
    const resultStr = snapshot.execSync(query)
    const result = OpleJSON.parse(resultStr)
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
