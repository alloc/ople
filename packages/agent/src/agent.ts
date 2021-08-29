import queueMicrotask from 'queue-microtask'
import { uid as makeId } from 'uid'
import { errors } from './errors'
import {
  AgentConfig,
  PackedCall,
  Patch,
  RefMap,
  ReplyQueue,
  Ref,
  ReplyHandler,
  Collection,
  BatchLike,
} from './types'

declare const console: { error: Function }

export type { AgentConfig }

export interface Agent {
  readonly host: string
  readonly port: number
  call<T = any>(method: string, args?: any[]): PromiseLike<T>
  onReply(replyId: string, handler: ReplyHandler): void
  flush(): void
}

export type AgentFactory = typeof makeAgent

export function makeAgent<RefHandle, Batch extends BatchLike>({
  protocol: makeTransport,
  host = 'localhost',
  port = 7999,
  makeBatch,
  enqueueCall,
  finalizeBatch,
  decodeReply,
  onSignal,
}: PrivateConfig<RefHandle, Batch>): Agent {
  let replyQueue: ReplyQueue = new Map()

  const transport = makeTransport({
    host,
    port,
    onConnect() {
      onSignal('@connect', [nextBatch])
      if (status == PENDING) {
        flush()
      }
    },
    onDisconnect() {
      // TODO: check if server received batch at all
      replyQueue.forEach(onReply => onReply(errors.disconnect))
      replyQueue.clear()

      onSignal('@disconnect')
    },
    onReply(data) {
      const [replyId, result, error] = decodeReply(data)
      if (replyId) {
        const onReply = replyQueue.get(replyId)
        if (onReply) {
          replyQueue.delete(replyId)
          onReply(error || null, result)
        }
      }
      // Non-replies are server-sent events.
      else if (Array.isArray(result)) {
        onSignal(result[0], result[1])
      }
    },
  })

  /** The unsent batch */
  let nextBatch = makeBatch()
  /** The batches awaiting a response */
  let batches: { [batchId: string]: Batch } = {}

  const IDLE = 0
  const FLUSHING = 1
  const PENDING = 2

  let status = IDLE
  function flush() {
    if (!transport.canSend()) {
      status = PENDING
      return
    }
    const batch = (batches[nextBatch.id] = nextBatch)
    const [payload, calls] = finalizeBatch(batch)

    replyQueue.set(batch.id, error => {
      if (error) {
        if (error == errors.disconnect) {
          mergeSets(nextBatch, batch, '@get')
          mergeSets(nextBatch, batch, '@pull')
          // TODO: check whether the server received the batch at all
          // TODO: have another promise for push/create/delete?
          return batch.resolve(nextBatch.promise)
        }
        try {
          const { reason, callIndex } = JSON.parse(error)
          console.error(
            `Function "${calls[callIndex][0]}" threw an error` +
              (reason ? `\n  ↳  ${reason.replace(/\n/g, '\n     ')}` : ``)
          )
        } catch {
          console.error(error)
        }
      } else {
        batch.resolve()
      }
    })

    transport.send(payload)
    nextBatch = makeBatch()
    status = IDLE
  }

  return {
    host,
    port,
    call(method, args) {
      if (status < FLUSHING) {
        status = FLUSHING
        queueMicrotask(flush)
      }
      return enqueueCall(nextBatch, [method, args])
    },
    onReply(replyId, handler) {
      replyQueue.set(replyId, handler)
    },
    flush,
  }
}

interface PrivateConfig<RefHandle, Batch> extends AgentConfig {
  /** Create a new batch. */
  makeBatch: () => Batch
  /** Add a backend call to the batch. Return a promise or a reply ID. */
  enqueueCall: (
    batch: Batch,
    call: [method: string, args: any[] | undefined]
  ) => PromiseLike<any>
  /** Finalize the batch and return an encoded request. */
  finalizeBatch: (batch: Batch) => [payload: Uint8Array, calls: PackedCall[]]
  /** Decode a reply. */
  decodeReply: (bytes: Uint8Array) => [string, any, string?]
  /** Receive signals from the backend. */
  onSignal: (name: string, args?: any[]) => void
}

function mergeSets(dest: any, src: any, key: string) {
  dest[key] = new Set([...dest[key], ...src[key]])
}
