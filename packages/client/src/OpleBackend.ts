import { AnyFn } from '@alloc/types'
import { makeAgent, Agent, ReplyHandler, AgentConfig } from '@ople/agent'
import { makeBatchEncoder, makeReplyDecoder, PackedCall } from '@ople/nason'
import { uid } from 'uid'
import { PutCache } from './utils/PutCache'
import { defer, Deferred } from './utils/defer'
import { OpleCollection, OpleTime } from './values'
import { getEncoder } from './nason'
import { OpleSignal } from './OpleSignal'
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
  getCollection,
  initHandle,
  initRef,
  OpleRef,
  OpleRefHandle,
  ref,
  takeChanges,
  toRef,
} from './OpleRef'
import invariant from 'tiny-invariant'

export { ws, http } from '@ople/agent'

type SignalHandlers = { [name: string]: (...args: any[]) => void }

export interface OpleBackend<Signals extends Record<string, AnyFn> = any> {
  readonly cache: {
    /** Get a remote object by its ref. */
    get<T>(ref: OpleRef<T>): T | null
    /** Put a remote object in the cache. It must have a ref. */
    put(data: object): void
  }
  get<T>(ref: OpleRef<T>, force?: boolean): Promise<T>
  call: Agent['call']
  function(name: string): Function
  collection(name: string): OpleCollection
  signal(name: string): OpleSignal
}

export function defineBackend(config: AgentConfig) {
  const handleCache = new PutCache<OpleRefHandle>()
  const collections: Record<string, OpleCollection> = {}

  const coding = getEncoder(([ref, ts, data]) => initHandle(data, ref, ts))

  // TODO: use this for global signals only
  const signalMap: { [name: string]: Set<SignalHandlers> } = {}

  /** Refs whose data is being fetched */
  const fetchQueue: Record<string, Deferred<OpleRefHandle>> = {}

  const enqueueMethodCall = (batch: OpleBatch, call: OpleMethodCall) => {
    if (call[0] == '@get') {
      const [ref] = call[1]
      if (!fetchQueue[ref]) {
        fetchQueue[ref] = defer()
        batch.call('@get', ref)
      }
      return fetchQueue[ref]
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
                fetchQueue[handle].resolve(handle)
                delete fetchQueue[handle]
              }),
      ]
    },
  }

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
    decodeReply: makeReplyDecoder(coding),
    onSignal(name, args = []) {
      // Resubscribe to all watched records.
      if (name == '@connect' && watched.size) {
        const batch = args[0] as OpleBatch
        batch.queues['@watch'] = new Set(watched)
        agent.flush()
      }
      signalMap[name].forEach(handlers => {
        handlers[name](...args)
      })
    },
  })

  const backend: OpleBackend = {
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
    function: name => agent.call.bind(agent, name),
    collection: name =>
      collections[name] ||
      (collections[name] = new OpleCollection(name, backend)),
    signal() {
      // TODO
    },
  }

  return Object.setPrototypeOf(backend, methods)
}
