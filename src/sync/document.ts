import { OpleRef, OpleTime } from '../values'

export interface OpleDocument<T extends object | null = any> {
  ref: OpleRef<T>
  data: T
  ts: OpleTime
}

export namespace OpleDocument {
  export interface Options {
    credentials?: object
    delegates?: object
    ttl?: OpleTime
  }
}
