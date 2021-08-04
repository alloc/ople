import { makeAgent, Agent, AgentConfig } from '@ople/agent'
import {
  makeBatchEncoder,
  makeReplyDecoder,
  Config as Coding,
  PackedRecord,
} from '@ople/nason'
import { OpleTime, OpleRef } from './values'
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
import { setEffect } from './Ople'
import { getEncoder } from './nason'

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
      const record = records[ref]
      if (record) {
        data.__lastModified = ts
        return applyPatch(record, data)
      }
    }

    const coding = getEncoder(([ref, ts, data]) => {
      let record = updateRecord(ref, ts, data)
      if (!record) {
        const collection = ref.collection!.id
        const recordType = collectionTypes[collection]

        records[ref] = record = new OpleRecord(ref, ts)
        Object.setPrototypeOf(record, recordType)
        Object.assign(record, data)
        setHidden(record, '__collection', getCollectionByName(collection))

        // TODO: call `prepare` for each superclass
        prepare(record, recordType)
      }
      return record
    })

    const signalMap: { [name: string]: Set<SignalHandlers> } = {}

    // The agent handles remote communication.
    const agent = makeAgent<OpleRecord>({
      ...config,
      encodeBatch: makeBatchEncoder(coding),
      decodeReply: makeReplyDecoder(coding),
      updateRecord,
      getModified,
      getLastModified: record => getLastModified(record).date.getTime(),
      getCollection: record => getCollection(record).ref,
      onSignal(name, args = []) {
        signalMap[name].forEach(handlers => {
          handlers[name](...args)
        })
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
        get: (ref): any => records[ref] || null,
      },
      async get(ref, force): Promise<any> {
        const record = records[ref]
        const getting = (force || !record) && agent.call('@get', [ref])
        return record || getting
      },
      call: agent.call,
      collection: getCollectionByName,
      subscribe(
        refOrHandlers: OpleRef | SignalHandlers,
        handlers?: SignalHandlers
      ) {
        let refPrefix: string | undefined
        if (handlers) {
          refPrefix = (refOrHandlers as OpleRef).toString()
        } else {
          handlers = refOrHandlers as SignalHandlers
        }
        setEffect(handlers, active => {
          for (let name in handlers) {
            if (refPrefix) {
              name = refPrefix + name
            }
            let set = signalMap[name]
            if (active) {
              set ||= signalMap[name] = new Set()
              set.add(handlers)
            } else {
              set.delete(handlers)
              if (!set.size) {
                delete signalMap[name]
              }
            }
          }
        })
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
