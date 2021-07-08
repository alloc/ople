import { OpleSet } from './set'
import { OpleRef, OpleTime } from '../values'

export interface OpleDocumentOptions {
  credentials?: object
  delegates?: object
  ttl?: string | OpleTime
}

export interface OpleDocument<T = any> {
  ref: OpleRef
  data: Readonly<T>
  ts: OpleTime
}
