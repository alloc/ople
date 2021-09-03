import { OpleArray, OpleCollection, OpleDocument, OpleSet } from './types'
import { OpleDate, OpleRef, OpleTime } from '../values'

// String functions
export interface OpleFunctions {
  contains(str: string, substr: string): boolean
  contains(str: string, regex: RegExp): boolean
  endsWith(str: string, suffix: string): boolean
}

// Type-checking functions
export interface OpleFunctions {
  isArray(value: unknown): value is OpleArray
  isBoolean(value: unknown): value is boolean
  isCollection(value: unknown): value is OpleCollection
  isDate(value: unknown): value is OpleDate
  isDoc(value: unknown): value is OpleDocument
  isDouble(value: unknown): value is number
  isInteger(value: unknown): value is number
  isLambda(value: unknown): value is (...args: any[]) => any
  isNull(value: unknown): value is null
  isNumber(value: unknown): value is number
  isObject(value: unknown): value is Record<string, unknown>
  isRef(value: unknown): value is OpleRef
  isSet(value: unknown): value is OpleSet
  isString(value: unknown): value is string
  isTimestamp(value: unknown): value is OpleTime
}

// Time functions
export interface OpleFunctions {
  now(): OpleTime
}

// Math functions
export interface OpleFunctions {
  degrees(radians: number): number
  radians(degrees: number): number
}

// Generic functions
export interface OpleFunctions {
  max<T>(...values: T[]): T
  min<T>(...values: T[]): T
}
