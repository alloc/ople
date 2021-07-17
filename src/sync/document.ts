import { OpleRef, OpleTime } from '../values'

export interface OpleDocumentOptions {
  credentials?: object
  delegates?: object
  ttl?: OpleTime
}

export interface OpleDocument<
  T extends object | null = any,
  _T extends object | null = T, // This helps in converting from query type to user type.
> {
  ref: OpleRef
  data: Readonly<T>
  ts: OpleTime
}
