import { makeAgent, Agent, AgentConfig } from '@ople/agent'
import {
  makeBatchEncoder,
  makeReplyDecoder,
  Config as Coding,
  PackedRecord,
} from '@ople/nason'
import { OpleTime, OpleRef } from '@ople/nason'
import {
  OpleRecord,
  getCollection,
  getModified,
  getLastModified,
  applyPatch,
} from './Record'
import { OpleCollection } from './Collection'
import { prepare } from './prepare'
import { setHidden } from './common'

export { ws, http } from '@ople/agent'

type SignalHandlers = { [name: string]: (...args: any[]) => void }

export interface OpleClient {
  readonly cache: {
    get<T extends OpleRecord>(ref: OpleRef<T>): T | null
  }
  get<T extends OpleRecord>(ref: OpleRef<T>, force?: boolean): Promise<T>
  call: Agent['call']
  collection(name: string): OpleCollection
  /**
   * Subscribe to global signals from the backend.
   */
  subscribe(handlers: SignalHandlers): void
  /**
   * Subscribe to ref-specific signals from the backend.
   */
  subscribe(ref: OpleRef, handlers: SignalHandlers): void
}

export function defineClient<T extends OpleClient>(collectionTypes: {
  [name: string]: typeof OpleRecord
}) {
  return function makeClient(config: ClientConfig): T {
    const records: RecordCache = {}
    const collections: { [name: string]: OpleCollection } = {}
    const getCollectionByName = (name: string) =>
      collections[name] ||
      (collections[name] = new OpleCollection(
        new OpleRef(name, OpleRef.Native.collections),
        client
      ))

    function updateRecord(ref: OpleRef, ts: OpleTime, data: any) {
      const record = records[ref as any]
      if (record) {
        data.__lastModified = ts
        return applyPatch(record, data)
      }
    }

    const coding: Coding<OpleRecord> = {
      isRecord: arg => (arg && arg.constructor) === OpleRecord,
      packRecord: (record: OpleRecord) => record.ref!,
      unpackRecord([ref, ts, data]: PackedRecord) {
        let record = updateRecord(ref, ts, data)
        if (!record) {
          const collection = ref.collection!.id
          const recordType = collectionTypes[collection]

          records[ref as any] = record = new OpleRecord(ref, ts)
          Object.setPrototypeOf(record, recordType)
          Object.assign(record, data)
          setHidden(record, '__collection', getCollectionByName(collection))

          // TODO: call `prepare` for each superclass
          prepare(record, recordType)
        }
        return record
      },
    }

    // The agent handles remote communication.
    const agent = makeAgent<OpleRecord>({
      ...config,
      encodeBatch: makeBatchEncoder(coding),
      decodeReply: makeReplyDecoder(coding),
      updateRecord,
      getModified,
      getLastModified,
      getCollection: record => getCollection(record).ref,
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

    const client: OpleClient = {
      cache: {
        get: (ref): any => records[ref as any] || null,
      },
      async get(ref, force): Promise<any> {
        const record = records[ref as any]
        const getting = (force || !record) && agent.call('@get', [ref])
        return record || getting
      },
      call: agent.call,
      collection: getCollectionByName,
      subscribe(
        refOrHandlers: OpleRef | SignalHandlers,
        handlers?: SignalHandlers
      ) {
        let ref: OpleRef | undefined
        if (handlers) {
          ref = refOrHandlers as OpleRef
        } else {
          handlers = refOrHandlers as SignalHandlers
        }
      },
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
  [ref: string]: OpleRecord
}
