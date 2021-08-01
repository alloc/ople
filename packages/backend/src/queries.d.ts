import { Ref, FaunaTime, FaunaDate } from '@ople/data'
import { ToExpr, Page, ExprVal } from 'faunadb'
import { Omit } from '@alloc/types'
import * as pseudo from './fauna'

/** Convert the given pseudo-queries into FaunaDB-compatible queries */
export type FaunaQueries<T extends object> = OmitNever<
  {
    [P in keyof T]: P extends 'Lambda'
      ? never
      : T[P] extends (...args: infer In) => infer Out
      ? (...args: FaunaArgs<In>) => ToExpr<FaunaVal<Out>>
      : never
  }
>

type FaunaArgs<T extends any[]> = {
  [P in keyof T]: ExprVal<FaunaVal<T[P]>>
}

type FaunaVal<T> = T extends pseudo.Ref<infer U>
  ? Ref // TODO: should be `Ref<FaunaVal<U>>` type
  : T extends pseudo.SetRef<infer U>
  ? unknown // TODO: should be `SetRef<FaunaVal<U>>` type
  : T extends pseudo.FaunaDate
  ? FaunaDate
  : T extends pseudo.FaunaTime
  ? FaunaTime
  : T extends pseudo.Page<infer U>
  ? Page<FaunaVal<U>>
  : T extends pseudo.Lambda
  ? unknown // TODO: should be `Query` type
  : T extends pseudo.Bytes
  ? unknown // TODO: should be `Bytes` type
  : T extends object
  ? { [P in keyof T]: FaunaVal<T[P]> }
  : T

type OmitNever<T extends object> = Omit<T, NeverKeys<T>>
type NeverKeys<T extends object> = {
  [P in keyof T]: [T[P]] extends [never] ? P : never
}[keyof T]
