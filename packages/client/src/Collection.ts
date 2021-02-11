import { Ref } from 'fauna-lite'
import { Client } from './client'
import { Record } from './Record'

export class Collection<T extends Record = any> {
  constructor(readonly ref: Ref, readonly client: Client) {}
}
