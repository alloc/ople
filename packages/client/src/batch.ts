import queueMicrotask from '@alloc/queue-microtask'
import { Agent } from '@ople/agent'
import type { Record } from './Record'
import { RecordCache } from './types'
import { getRefs } from './Ref'
import { $M, $R } from './symbols'

type BatchedCall = [string, any[], (result: any) => void]

/** Message batching for an ople backend. */
export interface Batch extends ReturnType<typeof makeBatch> {}

/**
 * Batching reduces the number of messages sent to the server
 * by waiting for the next microtask.
 */
export const makeBatch = (agent: Agent, cache: RecordCache) => {
  const calls: BatchedCall[] = []
  const watched = new Set<Record>()
  const unwatched = new Set<Record>()
  const pushed = new Set<Record>()
  const pulled = new Set<Record>()
  const saved = new Set<Record>()
  const deleted = new Set<Record>()

  function updateCache(updates: { [ref: string]: any }) {
    for (const ref in updates) {
      const record = cache[ref]
      if (record) {
        Object.assign(record, updates[ref])
      }
    }
  }

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
          flushPushed({})
        }
        if (calls.length) {
          calls.forEach(flushCall)
          calls.length = 0
        }
        if (pulled.size) {
          // TODO: space out huge batches
          const payload = flushSet(pulled).reduce(getPullArgs, {})
          agent.invoke('ople.pull', [payload]).then(updateCache)
        }
      })
    }
  }

  /** Invoke a batched call */
  function flushCall([action, args, resolve]: BatchedCall) {
    resolve(agent.invoke(action, args))
  }

  /** Push a payload after merging pending changes */
  function flushPushed(payload: any) {
    flushSet(pushed).reduce(getPushArgs, payload)
    agent.invoke('ople.push', [payload]).then(updateCache, () => {
      for (const ref in payload) {
        if (cache[ref]) {
          getPushArgs(payload, cache[ref])
        } else {
          payload[ref] = undefined
        }
      }
      flushPushed(payload)
    })
  }

  return {
    calls,

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
