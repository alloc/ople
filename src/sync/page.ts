import { OpleArray, OpleArrayLike, OpleIterable } from './array'

export interface OplePage<T> extends OpleArrayLike<T>, OpleIterable<T> {
  readonly data: OpleArray<T>
  readonly after?: OpleCursor
  readonly before?: OpleCursor
  drop(count: number): this
  take(count: number): this
}

export interface OpleCursor {}
