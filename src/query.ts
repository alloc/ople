import { Snapshot } from './internal/db'
import { queryMap } from './queryMap'
import { OpleFunctions } from './sync/stdlib'
import { q } from './sync/transaction'
import {
  OpleCollection,
  OpleCursor,
  OpleDocument,
  OplePage,
  OpleSet,
} from './sync/types'
import { OpleQueryError, popStackFrames } from './errors'
import { OpleRef, OpleTime } from './values'
import { DeepFreeze, ToQuery } from './convert'
import { OpleJSON } from './json'

export interface OpleQueries extends OpleFunctions {
  get<T extends object | null>(ref: OpleRef<T>): OpleQuery.Document<T>

  exists(ref: OpleRef): boolean

  create<T extends object | null>(
    collection: OpleRef,
    params: { data: T } & OpleDocument.Options,
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
    params: { data?: Partial<T> } & OpleDocument.Options,
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

export namespace OpleQuery {
  /**
   * A query evaluated to a document.
   *
   * Note: Mutations will **not** update this snapshot.
   */
  export declare class Document<T extends object | null = any> {
    readonly ref: Ref<T>
    readonly data: DeepFreeze<ToQuery<T>>
    readonly ts: OpleTime

    /** Enforces type nominality */
    private _document: { data: T }
  }
  /** A query evaluated to a document ref. */
  export class Ref<T extends object | null = any> extends OpleRef<T> {
    get exists(): boolean {
      return q.exists(this)
    }
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
