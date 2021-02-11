import { makeAgent, AgentConfig } from '@ople/agent'
import {
  makeBatchEncoder,
  makeReplyDecoder,
  Config as Coding,
  PackedRecord,
} from '@ople/nason'
import { FaunaTime, Ref } from 'fauna-lite'
import { Record, getModified, getLastModified } from './Record'
import { Collection } from './Collection'
import { collectionByRef } from './Ref'

export { ws, http } from '@ople/agent'

export interface Client {
  readonly cache: {
    get<T extends Record>(ref: Ref<T>): T | null
  }
  get<T extends Record>(ref: Ref<T>, force?: boolean): Promise<T>
}

export function makeClientFactory<
  Collections extends { [name: string]: typeof Record },
  Methods extends { [method: string]: (...args: any[]) => any }
>(collectionTypes: Collections) {
  return function makeClient(config: ClientConfig): Client {
    const collections: { [name: string]: Collection } = {}
    const cache: RecordCache = {}

    function getCollection(ref: Ref) {
      return (
        collections[ref.id] ||
        (collections[ref.id] = new Collection(ref, client))
      )
    }

    function updateRecord(ref: Ref, ts: FaunaTime, data: any) {
      const record = cache[ref as any]
      if (record) {
        data.__lastModified = ts
        return Object.assign(record, data) as Record
      }
    }

    const coding: Coding<Record> = {
      Record,
      packRecord: record => record.ref!,
      unpackRecord([ref, ts, data]: PackedRecord) {
        let record = updateRecord(ref, ts, data)
        if (!record) {
          cache[ref as any] = record = new Record(ts)
          collectionByRef.set(ref, getCollection(ref.collection!))
          Object.setPrototypeOf(record, collectionTypes[ref.collection!.id])
          Object.assign(record, data)
        }
        return record
      },
    }

    const agent = makeAgent<Record>({
      ...config,
      encodeBatch: makeBatchEncoder(coding),
      decodeReply: makeReplyDecoder(coding),
      updateRecord,
      getModified,
      getLastModified,
      onSignal() {
        // TODO
      },
    })

    const methods = new Proxy(Object.prototype, {
      get(_, method: string) {
        return (...args: any[]) => agent.call(method, args)
      },
    })

    const client: Client & { __proto__: any } = {
      __proto__: methods,
      cache: {
        get: (ref): any => cache[ref as any] || null,
      },
      async get(ref, force): Promise<any> {
        const record = cache[ref as any]
        const getting = (force || !record) && agent.call('@get', [ref])
        return record || getting
      },
    }

    return client
  }
}

// function getTypeChain(type: any) {
//   const typeChain: any[] = []
//   while (type !== Record) {
//     typeChain.unshift(type)
//     type = Object.getPrototypeOf(type.prototype).constructor
//   }
//   return typeChain
// }

interface ClientConfig extends AgentConfig {}

interface RecordCache {
  [ref: string]: Record
}
