import queueMicrotask from 'queue-microtask'
import { uid as makeId } from 'uid'
import { Deferred } from 'ts-deferred'
import { errors } from './errors'
import {
  AgentConfig,
  Batch,
  PackedCall,
  OpleMethod,
  Patch,
  RefMap,
  ReplyQueue,
  OpleRef,
  FetchQueue,
} from './types'

declare const console: { error: Function }

export type { AgentConfig }

export interface Agent {
  readonly host: string
  readonly port: number
  call(method: OpleMethod, args: [any]): Promise<any>
  call(method: string, args?: any[]): Promise<any>
}

export type AgentFactory = typeof makeAgent

export function makeAgent<Record extends { ref: OpleRef | null }>({
  protocol: makeTransport,
  host = 'localhost',
  port = 7999,
  encodeBatch,
  decodeReply,
  updateRecord,
  getCollection,
  getModified,
  getLastModified,
  onSignal,
}: PrivateConfig<Record>): Agent {
  let watched = new Set<Record>()
  let replyQueue: ReplyQueue = new Map()
  let fetchQueue: FetchQueue<Record> = {}

  const transport = makeTransport({
    host,
    port,
    onConnect() {
      onSignal('@connect')

      // Resubscribe to all watched records.
      nextBatch['@watch'] = new Set(watched)

      // Flush the batch if necessary.
      if (watched.size || status == PENDING) {
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
          onReply(error || null, result)
        }
      }
      // Non-replies are server-sent events.
      else if (Array.isArray(result)) {
        onSignal(result[0], result.slice(1))
      }
    },
  })

  /** The unsent batch */
  let nextBatch = makeBatch<Record>()
  /** The batches awaiting a response */
  let batches: { [batchId: string]: Batch<Record> } = {}

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
    const calls: PackedCall[] = []
    for (const method in batch) {
      const records = batch[method]
      const payload =
        method == '@push'
          ? (batch.patches = getPatches(records))
          : method == '@pull'
          ? getPullMap(records)
          : Array.from(
              records,
              method == '@create'
                ? record => [record.ref, getCollection(record)]
                : record => record.ref
            )

      calls.push([method, [payload], ''])
    }
    interface BatchResponse {
      created?: OpleRef[]
      fetched?: Record[]
      pulled?: [OpleRef, any, any][]
    }
    replyQueue.set(batch.id, (error, response: BatchResponse) => {
      if (error) {
        if (error == errors.disconnect) {
          mergeSets(nextBatch, batch, '@get')
          mergeSets(nextBatch, batch, '@pull')
          // TODO: check whether the server received the batch at all
          // TODO: have another promise for push/create/delete?
          return batch.resolve(nextBatch.promise)
        }
        return console.error(error)
      }

      const { created, fetched, pulled } = response

      if (created) {
        let i = 0
        batch['@create'].forEach(record => {
          record.ref = created[i++]
        })
      }

      if (fetched)
        for (const record of fetched) {
          fetchQueue[record.ref as any].resolve(record)
          delete fetchQueue[record.ref as any]
        }

      if (pulled)
        for (const [ref, ts, data] of pulled) {
          updateRecord(ref, ts, data)
        }

      batch.resolve()
    })
    transport.send(encodeBatch(batch.id, calls.concat(batch.calls)))
    nextBatch = makeBatch()
    status = IDLE
  }

  function getPatches(records: Set<Record>) {
    const patches: RefMap<Patch> = {}
    records.forEach(record => {
      const patch: Patch = {}
      const modified = getModified(record)
      if (modified.size) {
        patches[record.ref as any] = patch
        modified.forEach(key => {
          patch[key] = record[key as keyof Record]
        })
        modified.clear()
      }
    })
    // Ensure at least one patch exists.
    for (const _ in patches) {
      return patches
    }
    return null
  }

  function getPullMap(records: Set<Record>) {
    const pulls: RefMap<number> = {}
    records.forEach(record => {
      pulls[record.ref as any] = getLastModified(record)
    })
    return pulls
  }

  return {
    host,
    port,
    call(method: string, args?: any[]) {
      let promise: Promise<any>
      if (method[0] == '@') {
        if (method == '@get') {
          const [ref] = args!
          if (!fetchQueue[ref]) {
            fetchQueue[ref] = new Deferred()
            nextBatch[method].add(ref)
          }
          promise = fetchQueue[ref].promise
        } else {
          const [record] = args as [Record]
          if (method == '@watch') {
            nextBatch['@unwatch'].delete(record)
            watched.add(record)
          } else if (method == '@unwatch' || method == '@delete') {
            nextBatch['@watch'].delete(record)
            watched.delete(record)
          }
          nextBatch[method].add(record)
          promise = nextBatch.promise
        }
      } else {
        const trace = Error()
        const replyId = makeId()
        nextBatch.calls.push([method, args || null, replyId])
        promise = new Promise<any>((resolve, reject) => {
          replyQueue.set(replyId, (error, result) => {
            replyQueue.delete(replyId)
            if (error) {
              trace.message = error
              reject(trace)
            } else {
              resolve(result)
            }
          })
        })
      }
      if (status < FLUSHING) {
        status = FLUSHING
        queueMicrotask(flush)
      }
      return promise
    },
  }
}

interface PrivateConfig<Record> extends AgentConfig {
  /** Encode a batch request. */
  encodeBatch: (batchId: string, calls: PackedCall[]) => Uint8Array
  /** Decode a reply. */
  decodeReply: (bytes: Uint8Array) => [string, any, string?]
  /** Update the local version of a `Record` object. */
  updateRecord: (ref: OpleRef, ts: any, data: any) => void
  /** Get the collection of a `Record` object. */
  getCollection: (record: Record) => OpleRef
  /** Get unsaved changes to a `Record` object. */
  getModified: (record: Record) => Set<string>
  /** Get timestamp of the last saved change. */
  getLastModified: (record: Record) => number
  /** Receive signals from the backend. */
  onSignal: (name: string, args?: any[]) => void
}

// TODO: Pulled changes and new refs are in the batch response.
const makeBatch = <Record>(): Batch<Record> => {
  const batch = {
    '@watch': new Set<Record>(),
    '@unwatch': new Set<Record>(),
    '@push': new Set<Record>(),
    '@pull': new Set<Record>(),
    '@create': new Set<Record>(),
    '@delete': new Set<Record>(),
    '@get': new Set<OpleRef>(),
  }
  let resolve!: Function
  return setHidden(batch, {
    id: makeId(),
    calls: [],
    patches: null,
    promise: new Promise<void>(f => (resolve = f)),
    resolve,
  })
}

function setHidden(obj: any, values: { [key: string]: any }) {
  for (const key in values)
    Object.defineProperty(obj, key, { value: values[key] })
  return obj
}

function mergeSets(dest: any, src: any, key: string) {
  dest[key] = new Set([...dest[key], ...src[key]])
}
