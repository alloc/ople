export function toArray<T>(arg: { [key: string]: T }): [string, T][]
export function toDate(arg: string): Date
export function toDouble(arg: number): number
export function toInteger(arg: number): number
export function toMicros(arg: Time): number
export function toMillis(arg: Time): number
export function toNumber(arg: any): number
export function toObject<T>(arg: [string, T][]): { [key: string]: T }
export function toSeconds(arg: any): number
export function toString(arg: any): string
export function toTime(arg: any): Time

export function isArray(arg: any): arg is any[]
export function isBoolean(arg: any): arg is boolean
export function isBytes(arg: any): arg is Bytes
export function isCollection(arg: any): arg is CollectionRef
export function isDatabase(arg: any): arg is DatabaseRef
export function isDate(arg: any): arg is Date
export function isDouble(arg: any): boolean
export function isEmpty(arg: any): boolean
export function isFunction(arg: any): arg is FunctionRef
export function isIndex(arg: any): arg is IndexRef
export function isInteger(arg: any): boolean
export function isKey(arg: any): arg is Key
export function isLambda(arg: any): arg is (...args: any[]) => any
export function isNonEmpty(arg: any): boolean
export function isNull(arg: any): arg is null
export function isNumber(arg: any): arg is number
export function isObject(arg: any): arg is object
export function isRecord(arg: any): arg is Record
export function isRef(arg: any): arg is Ref
export function isRole(arg: any): arg is Role
export function isSet(arg: any): arg is SetRef
export function isString(arg: any): arg is string
export function isTimestamp(arg: any): arg is Time
export function isToken(arg: any): arg is Token

export abstract class Bytes {
  private _typeName: 'Bytes'
}
export abstract class Time {
  private _typeName: 'Time'
}
export abstract class Date {
  private _typeName: 'Date'
}
export abstract class SetRef {
  private _typeName: 'SetRef'
}
export abstract class Ref {
  private _typeName: 'Ref'
}
export abstract class Page {
  private _typeName: 'Page'
}
export abstract class Key {
  private _typeName: 'Key'
}
export abstract class Token {
  private _typeName: 'Token'
}
export abstract class Role {
  private _typeName: 'Role'
}
