import { OpleRef } from './values'
import { OpleClient } from './client'
import { OpleRecord } from './Record'

/** Local cache for records from the same collection. */
export class OpleCollection<T extends OpleRecord = any> {
  constructor(readonly ref: OpleRef, readonly client: OpleClient) {}
}
