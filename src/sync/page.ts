import { OpleArray } from './array'
import { OpleRef } from '../values'

export interface OplePage<T = any> {
  readonly data: OpleArray<T>
  readonly after?: OpleCursor
  readonly before?: OpleCursor
  drop(count: number): OplePage<T>
  take(count: number): OplePage<T>
}

// TODO: support other cursor types
export type OpleCursor = OpleRef
