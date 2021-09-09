import { makeAgent, Agent, ReplyHandler, AgentConfig } from '@ople/agent'
import { makeBatchEncoder, makeReplyDecoder, PackedCall } from '@ople/nason'
import invariant from 'tiny-invariant'
import { uid } from 'uid'
import { getEncoder } from './nason'
import { makeSignalFactory, OpleListener } from './signals'
import { defer, Deferred } from './utils/defer'
import { PutCache } from './utils/PutCache'
import { OpleTime } from './values'
import { withOple } from './OpleContext'
import { OpleRef } from './OpleRef'
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
  toDoc,
  takeChanges,
  toRef,
  OpleDocument,
  initDocument,
} from './OpleDocument'

export interface OpleBackend<
  Functions extends object = any,
  Signals extends object = any
> {
  readonly cache: {
    /** Get a remote object by its ref. */
    get<Ref extends OpleRef>(
      ref: Ref
    ): Ref extends OpleRef<infer T> ? T | null : never
    /** Put a remote object in the cache. */
    put(data: object): void
    /** Remove a remote object from the cache. */
    delete(data: object): void
  }
  get<Ref extends OpleRef>(
    ref: Ref,
    force?: boolean
  ): Promise<Ref extends OpleRef<infer T> ? T : never>
  call: Agent['call']
  emit<P extends keyof Signals>(
    name: P & string,
    ...args: SignalArgs<Signals[P]>
  ): void
  functions: Functions
  signals: Signals
}

export function defineBackend<
  Functions extends object,
  Signals extends object
>({
  onError,
  ...config
}: AgentConfig & {
  onError(error: any): void
}) {
  const documents = new PutCache<OpleDocument>()

  // Cache the promises of refs being fetched, so we can
  // avoid duplicate @get calls.
  const fetching: Record<string, Deferred<OpleDocument>> = {}

  const enqueueMethodCall = (batch: OpleBatch, call: OpleMethodCall) => {
    if (call[0] == '@get') {
      const [ref] = call[1]
      if (!fetching[ref]) {
        fetching[ref] = defer()
        batch.call('@get', ref)
      }
      return fetching[ref]
    }
    const [doc] = call[1]
    if (call[0] == '@watch') {
      batch.delete('@unwatch', doc)
      documents.put(doc)
      watched.add(doc)
    } else if (call[0] == '@unwatch' || call[0] == '@delete') {
      batch.delete('@watch', doc)
      if (watched.delete(doc)) {
        documents.delete(doc)
      }
    }
    if (call[0] == '@delete') {
      return Promise.resolve()
    }
    batch.call(call[0], doc)
    return batch.promise
  }

  const queuePackers: {
    [P in OpleMethod]: (
      queue: OpleMethodQueue<P>,
      batch: OpleBatch
    ) => [payload?: OpleMethodPayload<P>, onReply?: ReplyHandler]
  } = {
    '@push'(docs, batch) {
      // It's possible that all documents were deleted
      // between queueing and this call.
      if (docs.size) {
        const patches: PatchMap = {}
        docs.forEach(doc => {
          patches[doc] = takeChanges(doc)
        })
        batch.patches = patches
        return [patches]
      }
      return []
    },
    '@pull'(docs) {
      const pulls: Record<OpleDocument, string> = {}
      docs.forEach(doc => {
        pulls[doc] = doc.lastModified!.isoTime
        documents.put(doc)
      })
      return [
        pulls,
        (error, pulled: [OpleRef, OpleTime, any][]) =>
          error
            ? onError(error)
            : pulled.forEach(([ref, ts, data]) => {
                const doc = documents.take(ref)
                applyPatch(doc, data, ts)
              }),
      ]
    },
    '@delete'(docs) {
      return [docs]
    },
    '@watch'(docs) {
      return [docs]
    },
    '@unwatch'(docs) {
      return [docs]
    },
    '@get'(refs) {
      return [
        refs,
        (error, docs: OpleDocument[]) =>
          error
            ? onError(error)
            : docs.forEach(doc => {
                fetching[doc].resolve(doc)
                delete fetching[doc]
              }),
      ]
    },
  }

  const coding = getEncoder(
    function unpackRef(packedRef) {
      const [collection, id] = packedRef.split('/')
      return new OpleRef(id, collection, backend)
    },
    function unpackDocument([ref, ts, data]) {
      const doc = documents.get(ref)
      if (doc) {
        applyPatch(doc, data, ts)
        return doc.data
      }
      return initDocument(data, ref, ts)
    }
  )

  const watched = new Set<OpleDocument>()
  const encodeBatch = makeBatchEncoder(coding)

  // The agent docs remote communication.
  const agent = makeAgent<OpleDocument, OpleBatch>({
    ...config,
    makeBatch: () => new OpleBatch(),
    enqueueCall(batch, call) {
      if (call[0][0] == '@') {
        return enqueueMethodCall(batch, call as OpleMethodCall)
      }
      const trace = Error()
      const replyId = uid()
      batch.calls.push([...call, replyId])
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
    signals[name]?.forEach(listener => {
      withOple(listener.context!, listener, args)
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

  const backend: OpleBackend<Functions, Signals> = {
    cache: {
      get: (ref): any => documents.get(ref) || null,
      put(data) {
        const doc = toDoc(data)
        invariant(doc && doc.ref, 'Object passed to `cache.put` has no ref')
        documents.put(doc)
      },
      delete(data) {
        const doc = toDoc(data)
        invariant(doc && doc.ref, 'Object passed to `cache.delete` has no ref')
        documents.delete(doc)
      },
    },
    async get(ref, force): Promise<any> {
      return (!force && documents.get(ref)) || agent.call('@get', [ref])
    },
    call: agent.call,
    functions: makeFunctionMap(name => agent.call.bind(agent, name) as any),
    signals: makeFunctionMap(
      makeSignalFactory<Signals>(addListener, removeListener)
    ),
    emit(name, ...args) {
      agent.onSignal(name, args)
    },
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

export type SignalArgs<T> = Overloads<T> extends infer O
  ? O extends (listener: (...args: infer A) => any) => any
    ? A
    : never
  : never

/**
 * A hacky way to convert a group of call signatures (aka overloads)
 * into a union of function types.
 */
type Overloads<T> = T extends {
  (...args: infer A1): infer R1
  (...args: infer A2): infer R2
  (...args: infer A3): infer R3
}
  ? ((...args: A1) => R1) | ((...args: A2) => R2) | ((...args: A3) => R3)
  : T extends {
      (...args: infer A1): infer R1
      (...args: infer A2): infer R2
    }
  ? ((...args: A1) => R1) | ((...args: A2) => R2)
  : T extends (...args: any) => any
  ? T
  : never
