import queueMicrotask from 'queue-microtask'
import { uid as makeId } from 'uid'
import {
  AgentConfig,
  Batch,
  PackedCall,
  OpleMethod,
  Patch,
  RefMap,
  ReplyQueue,
} from './types'

export { AgentConfig }

export interface Agent<Record> {
  readonly host: string
  readonly port: number
  call(method: OpleMethod, args: [Record]): Promise<void>
  call(method: string, args?: any[]): Promise<any>
}

export type AgentFactory = typeof makeAgent

export function makeAgent<Record extends { ref: any }>({
  protocol: makeTransport,
  host = 'localhost',
  port = 7999,
  encodeBatch,
  decodeReply,
  getModified,
  getLastModified,
  onSignal,
}: PrivateConfig<Record>): Agent<Record> {
  let callQueue: PackedCall[] = []
  let replyQueue: ReplyQueue = new Map()

  const transport = makeTransport({
    host,
    port,
    onConnect() {
      // TODO: resubscribe to all watched documents
    },
    onDisconnect() {
      // TODO: repeat pulls (by merging them into next batch)
      callQueue = []
      replyQueue.forEach(onReply => onReply('Lost connection'))
      replyQueue.clear()
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

  let flushing = false
  function flush() {
    const batch = (batches[nextBatch.id] = nextBatch)
    const calls: PackedCall[] = []
    for (const method in batch) {
      const records = batch[method]
      const payload =
        method == '@push'
          ? (batch.patches = getPatches(records))
          : method == '@pull'
          ? getPullMap(records)
          : Array.from(records, record => record.ref)

      calls.push([method, [payload], ''])
    }
    transport.send(encodeBatch(batch.id, calls))
    nextBatch = makeBatch()
    flushing = false
  }

  function getPatches(records: Set<Record>) {
    const patches: RefMap<Patch> = {}
    records.forEach(record => {
      const patch: Patch = {}
      const modified = getModified(record)
      if (modified.size) {
        patches[record.ref] = patch
        modified.forEach((_, key) => {
          patch[key] = Reflect.get(record, key)
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
      pulls[record.ref] = getLastModified(record)
    })
    return pulls
  }

  return {
    host,
    port,
    call(method: string, args?: any[]) {
      if (method[0] === '@') {
        nextBatch[method].add(args![0])
        return nextBatch.promise
      }
      const trace = Error()
      const replyId = makeId()
      return new Promise<any>((resolve, reject) => {
        replyQueue.set(replyId, (error, result) => {
          replyQueue.delete(replyId)
          if (error) {
            trace.message = error
            reject(trace)
          } else {
            resolve(result)
          }
        })
        callQueue.push([method, args || null, replyId])
        if (!flushing) {
          flushing = true
          queueMicrotask(flush)
        }
      })
    },
  }
}

interface PrivateConfig<Record> extends AgentConfig {
  /** Encode a batch request. */
  encodeBatch: (batchId: string, calls: PackedCall[]) => Uint8Array
  /** Decode a reply. */
  decodeReply: (bytes: Uint8Array) => [string, any, string?]
  /** Get unsaved changes to a `Record` object. */
  getModified: (record: Record) => Map<string, unknown>
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
