import { Ref } from 'fauna-lite'
import { OpleClient } from './client'
import { Record } from './Record'

export class Collection<T extends Record = any> {
  constructor(readonly ref: Ref, readonly client: OpleClient) {}
}
