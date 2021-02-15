import { makeAgent, Agent, AgentConfig } from '@ople/agent'
import {
  makeBatchEncoder,
  makeReplyDecoder,
  Config as Coding,
  PackedRecord,
} from '@ople/nason'
import { FaunaTime, Ref } from 'fauna-lite'
import { Record, getModified, getLastModified, applyPatch } from './Record'
import { Collection } from './Collection'
import { collectionByRef } from './Ref'
import { prepare } from './prepare'

export { ws, http } from '@ople/agent'

export interface Client {
  readonly cache: {
    get<T extends Record>(ref: Ref<T>): T | null
  }
  get<T extends Record>(ref: Ref<T>, force?: boolean): Promise<T>
  call: Agent['call']
  collection(name: string): Collection
}

export function defineClient<T extends Client>(collectionTypes: {
  [name: string]: typeof Record
}) {
  return function makeClient(config: ClientConfig): T {
    const records: RecordCache = {}
    const collections: { [name: string]: Collection } = {}
    const getCollection = (name: string) =>
      collections[name] ||
      (collections[name] = new Collection(
        new Ref(name, Ref.Native.collections),
        client
      ))

    function updateRecord(ref: Ref, ts: FaunaTime, data: any) {
      const record = records[ref as any]
      if (record) {
        data.__lastModified = ts
        return applyPatch(record, data)
      }
    }

    const coding: Coding<Record> = {
      Record,
      packRecord: (record: Record) => record.ref!,
      unpackRecord([ref, ts, data]: PackedRecord) {
        let record = updateRecord(ref, ts, data)
        if (!record) {
          const collection = ref.collection!.id
          const recordType = collectionTypes[collection]
          collectionByRef.set(ref, getCollection(collection))

          records[ref as any] = record = new Record(ref, ts)
          Object.setPrototypeOf(record, recordType)
          Object.assign(record, data)

          // TODO: call `prepare` for each superclass
          prepare(record, recordType)
        }
        return record
      },
    }

    // The agent handles remote communication.
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

    // Syntax sugar for backend calls.
    const methods = new Proxy(Object.prototype, {
      get(_, method: string) {
        return (...args: any[]) => agent.call(method, args)
      },
    })

    const client: Client = {
      cache: {
        get: (ref): any => records[ref as any] || null,
      },
      async get(ref, force): Promise<any> {
        const record = records[ref as any]
        const getting = (force || !record) && agent.call('@get', [ref])
        return record || getting
      },
      call: agent.call,
      collection: getCollection,
    }

    return Object.setPrototypeOf(client, methods)
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
