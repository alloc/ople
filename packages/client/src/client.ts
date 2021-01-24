import { is } from '@alloc/is'
import { makeAgent, UserConfig as AgentConfig } from '@ople/agent'
import { FaunaTime, Ref } from 'fauna-lite'
import { uid as makeId } from 'uid'
import { Batch, makeBatch } from './batch'
import { Record } from './Record'
import { o } from 'wana'
import { reviveOple } from './Ople'
import { prepare } from './prepare'

export interface Client extends InstanceType<ReturnType<typeof makeClient>> {}

export function makeClient<
  Collections extends { [name: string]: typeof Record },
  Methods extends { [name: string]: (...args: any[]) => any }
>(config: { types: TypeConfig[] }) {
  const types: { [collection: string]: any } = {}

  return

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

    protected _invoke(name: keyof Methods, args: any[]) {
      const trace = Error()
      const replyId = makeId()
      return new Promise((resolve, reject) => {
        replyQueue.set(replyId, (error, result) => {
          replyQueue.delete(replyId)
          if (error) {
            trace.message = error
            reject(trace)
          } else {
            resolve(result)
          }
        })
        this.send(actionId, args, replyId)
      })
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

type TypeConfig = [constructor: typeof Record, collection: string]

interface ClientConfig extends AgentConfig {}

interface RecordCache {
  [ref: string]: Record
}
