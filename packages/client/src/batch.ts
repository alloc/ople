import queueMicrotask from '@alloc/queue-microtask'
import { Agent } from '@ople/agent'
import type { Record } from './Record'
import { getRefs } from './Ref'
import { $M, $R } from './symbols'

type BatchedCall = [string, any[], (result: any) => void]

/** Message batching for an ople backend. */
export interface Batch extends ReturnType<typeof makeBatch> {}

/**
 * Batching reduces the number of messages sent to the server
 * by waiting for the next microtask.
 */
export const makeBatch = (agent: Agent, cache: any) => {
  const calls: BatchedCall[] = []
  const watched = new Set<Record>()
  const unwatched = new Set<Record>()
  const pushed = new Set<Record>()
  const pulled = new Set<Record>()

  let isQueued = false
  function queueFlush() {
    if (!isQueued) {
      isQueued = true
      queueMicrotask(() => {
        isQueued = false

        if (watched.size) {
          agent.send('ople.watch', getRefs(flushSet(watched)))
        }
        if (unwatched.size) {
          agent.send('ople.unwatch', getRefs(flushSet(unwatched)))
        }
        if (pushed.size) {
          // TODO: space out huge batches
          const payload = flushSet(pushed).reduce(getPushArgs, {})
          agent.invoke('ople.push', [payload]).then((rejected: any[]) => {
            // TODO: handle rejected patches
          })
        }
        if (calls.length) {
          calls.forEach(flushCall)
          calls.length = 0
        }
        if (pulled.size) {
          const payload = flushSet(pulled).map(getPullArgs)
          agent.invoke('ople.pull', [payload]).then((response: any[]) => {
            for (let i = 0; i < response.length; i += 2) {
              Object.assign(cache[response[i]], response[i + 1])
            }
          })
        }
      })
    }
  }

  /** Invoke a batched call */
  function flushCall([action, args, resolve]: BatchedCall) {
    resolve(agent.invoke(action, args))
  }

  return {
    invoke(actionId: string, args: any[]) {
      queueFlush()
      return new Promise<T>(resolve => {
        calls.push([actionId, args, resolve])
      })
    },
    watch(record: Record) {
      if (unwatched.has(record)) {
        unwatched.delete(record)
      } else {
        watched.add(record)
        queueFlush()
      }
    },
    unwatch(record: Record) {
      if (watched.has(record)) {
        watched.delete(record)
      } else {
        unwatched.add(record)
        queueFlush()
      }
    },
    push(record: Record) {
      pushed.add(record)
      queueFlush()
    },
    pull(record: Record) {
      pulled.add(record)
      queueFlush()
    },
  }
}

function flushSet<T>(set: Set<T>) {
  const values = Array.from(set)
  set.clear()
  return values
}

function getPushArgs(payload: any, record: Record & { [key: string]: any }) {
  const changes: any = {}
  for (const key in record[$M]) {
    changes[key] = record[key]
  }

  payload[record[$R] as any] = changes
  return payload
}

function getPullArgs(payload: any, record: Record) {
  payload[record[$R] as any] = record.lastSyncTime
  return payload
}
