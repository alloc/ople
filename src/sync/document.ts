import { OpleRef, OpleTime } from '../values'

export interface OpleDocumentOptions {
  credentials?: object
  delegates?: object
  ttl?: OpleTime
}

export interface OpleDocument<T extends object | null = any> {
  ref: OpleRef
  data: Readonly<T>
  ts: OpleTime
}
