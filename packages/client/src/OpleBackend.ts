import { AnyFn } from '@alloc/types'
import { makeAgent, Agent, ReplyHandler, AgentConfig } from '@ople/agent'
import { makeBatchEncoder, makeReplyDecoder, PackedCall } from '@ople/nason'
import invariant from 'tiny-invariant'
import { uid } from 'uid'
import { getEncoder } from './nason'
import { makeSignalFactory, OpleListener, SignalFactory } from './signals'
import { defer, Deferred } from './utils/defer'
import { PutCache } from './utils/PutCache'
import { OpleCollection, OpleTime } from './values'
import { withOple } from './OpleContext'
import {
  OpleBatch,
  OpleMethod,
  OpleMethodCall,
  OpleMethodPayload,
  OpleMethodQueue,
  PatchMap,
} from './OpleBatch'
import {
  applyPatch,
  initRef,
  OpleRef,
  OpleRefHandle,
  ref,
  takeChanges,
  toRef,
} from './OpleRef'

export interface OpleBackend<
  Collections extends object = Record<string, OpleCollection>,
  Functions extends object = any,
  Signals extends object = any
> {
  readonly cache: {
    /** Get a remote object by its ref. */
    get<T>(ref: OpleRef<T>): T | null
    /** Put a remote object in the cache. It must have a ref. */
    put(data: object): void
  }
  get<T>(ref: OpleRef<T>, force?: boolean): Promise<T>
  call: Agent['call']
  collection<P extends keyof Collections>(name: P): Collections[P]
  collection(name: string): OpleCollection
  functions: Functions
  signals: Signals
}

export function defineBackend<
  Collections extends object,
  Functions extends object,
  Signals extends object
>(config: AgentConfig) {
  const handleCache = new PutCache<OpleRefHandle>()

  // Cache the promises of refs being fetched, so we can
  // avoid duplicate @get calls.
  const fetching: Record<string, Deferred<OpleRefHandle>> = {}

  const enqueueMethodCall = (batch: OpleBatch, call: OpleMethodCall) => {
    if (call[0] == '@get') {
      const [ref] = call[1]
      if (!fetching[ref]) {
        fetching[ref] = defer()
        batch.call('@get', ref)
      }
      return fetching[ref]
    }
    const [handle] = call[1]
    if (call[0] == '@watch') {
      batch.delete('@unwatch', handle)
      handleCache.put(handle)
      watched.add(handle)
    } else if (call[0] == '@unwatch' || call[0] == '@delete') {
      batch.delete('@watch', handle)
      if (watched.delete(handle)) {
        handleCache.delete(handle)
      }
    }
    if (call[0] == '@delete' && batch.delete('@create', handle)) {
      return Promise.resolve()
    }
    batch.call(call[0], handle)
    return batch.promise
  }

  const queuePackers: {
    [P in OpleMethod]: (
      queue: OpleMethodQueue<P>,
      batch: OpleBatch
    ) => [payload?: OpleMethodPayload<P>, onReply?: ReplyHandler]
  } = {
    '@push'(handles, batch) {
      // It's possible that all handles were deleted
      // between queueing and this call.
      if (handles.size) {
        const patches: PatchMap = {}
        handles.forEach(handle => {
          patches[handle] = takeChanges(handle)
        })
        batch.patches = patches
        return [patches]
      }
      return []
    },
    '@pull'(handles) {
      const pulls: Record<OpleRefHandle, string> = {}
      handles.forEach(handle => {
        pulls[handle] = handle.lastModified!.isoTime
        handleCache.put(handle)
      })
      return [
        pulls,
        (error, pulled: [OpleRef, OpleTime, any][]) =>
          error
            ? console.error(error)
            : pulled.forEach(([ref, ts, data]) => {
                const handle = handleCache.take(ref)
                applyPatch(handle, data, ts)
              }),
      ]
    },
    '@create'(handles) {
      return [
        Array.from(handles, handle => [
          getCollection(handle).id,
          takeChanges(handle),
        ]),
        (error, created: [OpleRef, OpleTime][]) => {
          if (error) {
            console.error(error)
          } else {
            let i = 0
            handles.forEach(handle => {
              const [ref, ts] = created[i++]
              initRef(handle, ref, ts)
            })
          }
        },
      ]
    },
    '@delete'(handles) {
      return [handles]
    },
    '@watch'(handles) {
      return [handles]
    },
    '@unwatch'(handles) {
      return [handles]
    },
    '@get'(refs) {
      return [
        refs,
        (error, handles: OpleRefHandle[]) =>
          error
            ? console.error(error)
            : handles.forEach(handle => {
                fetching[handle].resolve(handle)
                delete fetching[handle]
              }),
      ]
    },
  }

  const collections: Record<string, OpleCollection> = {}
  const getCollection = (name: string) =>
    collections[name] || (collections[name] = new OpleCollection(name, backend))

  const coding = getEncoder(getCollection)
  const watched = new Set<OpleRefHandle>()
  const encodeBatch = makeBatchEncoder(coding)

  // The agent handles remote communication.
  const agent = makeAgent<OpleRefHandle, OpleBatch>({
    ...config,
    makeBatch: () => new OpleBatch(),
    enqueueCall(batch, call) {
      if (call[0][0] == '@') {
        return enqueueMethodCall(batch, call as OpleMethodCall)
      }
      const trace = Error()
      const replyId = uid()
      batch.calls.push([
        call[0] /* method */,
        call[1] || null /* args */,
        replyId,
      ])
      return new Promise((resolve, reject) => {
        agent.onReply(replyId, (error, result) => {
          if (error) {
            trace.message = error
            reject(trace)
          } else {
            resolve(result)
          }
        })
      })
    },
    finalizeBatch(batch) {
      let calls: PackedCall[] = []
      for (const [method, queue] of Object.entries(batch.queues)) {
        const [payload, onReply] = queue.size
          ? queuePackers[method as OpleMethod](queue as any, batch)
          : []

        if (payload) {
          let replyId = ''
          if (onReply) {
            replyId = uid()
            agent.onReply(replyId, onReply)
          }
          calls.push([method, [payload], replyId])
        }
      }
      calls = calls.concat(batch.calls)
      return [encodeBatch(batch.id, calls), calls]
    },
    mergeBatches(batch, nextBatch) {
      mergeSets(nextBatch.queues, batch.queues, '@get')
      mergeSets(nextBatch.queues, batch.queues, '@pull')
    },
    decodeReply: makeReplyDecoder(coding),
    onSignal(name, args = []) {
      // Resubscribe to all watched records.
      if (name == '@connect' && watched.size) {
        const batch = args[0] as OpleBatch
        batch.queues['@watch'] = new Set(watched)
        agent.flush()
      }

      emit(name, args)

      // When the first argument is an OpleRef, we need to notify
      // any ref-specific listeners.
      if (!name.startsWith('r:') && args[0]?.constructor == OpleRef) {
        emit('r:' + args[0] + ':' + name, args.slice(1))
      }
    },
  })

  const signals: { [name: string]: Set<OpleListener> } = {}
  const emit = (name: string, args: any[]) =>
    signals[name]?.forEach(handler => {
      withOple(handler.context!, handler, args)
    })

  function addListener(target: any, signalId: string, listener: OpleListener) {
    if (target) {
      signalId = 'r:' + toRef(target) + ':' + signalId
    }
    let listeners = signals[signalId]
    if (!listeners) {
      listeners = signals[signalId] = new Set()
    }
    listeners.add(listener)
  }

  function removeListener(
    target: any,
    signalId: string,
    listener: OpleListener
  ) {
    if (target) {
      signalId = 'r:' + toRef(target) + ':' + signalId
    }
    const listeners = signals[signalId]
    if (listeners?.delete(listener) && !listeners.size) {
      delete signals[signalId]
    }
  }

  const backend: OpleBackend<Collections, Functions, Signals> = {
    cache: {
      get: (ref): any => handleCache.get(ref) || null,
      put(data) {
        invariant(toRef(data), 'Ref must exist')
        handleCache.put(ref(data))
      },
    },
    async get(ref, force): Promise<any> {
      return (!force && handleCache.get(ref)) || agent.call('@get', [ref])
    },
    call: agent.call,
    collection: getCollection,
    functions: makeFunctionMap(name => agent.call.bind(agent, name) as any),
    signals: makeFunctionMap(
      makeSignalFactory<Signals>(addListener, removeListener)
    ),
  }

  return backend
}

function makeFunctionMap<T, P extends string & keyof T>(
  get: (key: P) => T[P]
): T {
  return new Proxy(get, {
    get: (_, key: string) => get(key as P),
  }) as any
}

type Keys<T, U> = { [P in keyof T]: T[P] extends U ? P : never }[keyof T]

function mergeSets<T, P extends Keys<T, Set<any>>>(dest: T, src: T, key: P) {
  dest[key] = new Set([...dest[key], ...src[key]]) as any
}
