import { Client } from './client'
import { Record } from './Record'

export class Collection<T extends Record = any> {
  constructor(readonly name: string, readonly client: Client) {}
}
