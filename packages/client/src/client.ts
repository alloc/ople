import { is } from '@alloc/is'
import { makeAgent, UserConfig as AgentConfig } from '@ople/agent'
import { Ref } from 'fauna-lite'
import { Batch, makeBatch } from './batch'
import { Record } from './Record'
import { $R } from './symbols'
import { o } from 'wana'
import { reviveOple } from './Ople'
import { prepare } from './prepare'

export interface Client extends InstanceType<ReturnType<typeof makeClient>> {}

export function makeClient(config: { types: TypeConfig[] }) {
  const types: { [collection: string]: any } = {}

  config.types.forEach(([constructor, collection]) => {
    constructor[$R] = collection[$R]
    types[collection[$R]] = constructor
  })

  class Client {
    protected _cache: RecordCache = {}

    constructor(config: ClientConfig) {
      const agent = makeAgent({
        ...config,
        encode(key, val) {
          // TODO
        },
        decode(key, val) {
          // TODO
        },
        onSignal(name, args) {
          // TODO
        },
      })
      Object.assign(this, makeBatch(agent, this._cache))
    }

    readonly cache = {
      get: (ref: Ref) => this._cache[ref as any] || null,
    } as const

    async get(ref: Ref): Promise<any>
    async get(refs: Ref[]): Promise<any[]>
    async get(refs: Ref | Ref[]) {
      const results: any[] = await this.invoke('ople.get', [
        is.array(refs) ? refs : [refs],
      ])
      return is.array(refs) ? results : results[0]
    }

    parse(payload: string) {
      // TODO
    }

    protected invoke!: Batch['invoke']

    protected _parseRecord({ ref, data, ts }: any) {
      let self = this._cache[ref]
      // Avoid overwriting a cached record.
      if (!self) {
        const type = types[ref.collection]
        this._cache[ref] = self = o({
          ...data,
          [$R]: ref,
          lastSyncTime: ts,
          __proto__: type.prototype,
        })
        reviveOple(self)
        for (const ctr of getTypeChain(type)) {
          prepare(self, ctr)
        }
      }
      // Merge the data if the timestamp is newer.
      else if (!self.lastSyncTime || ts.isoTime > self.lastSyncTime.isoTime) {
        self.lastSyncTime = ts
        Object.assign(self, data)
      }
      return self
    }
  }

  Object.setPrototypeOf(
    Client.prototype,
    new Proxy(Object.prototype, {
      // TODO: assume RPC call
    })
  )

  return Client
}

function getTypeChain(type: any) {
  const typeChain: any[] = []
  while (type !== Record) {
    typeChain.unshift(type)
    type = Object.getPrototypeOf(type.prototype).constructor
  }
  return typeChain
}

type TypeConfig = [constructor: any, collection: any]

interface ClientConfig extends AgentConfig {}

interface RecordCache {
  [ref: string]: Record
}
