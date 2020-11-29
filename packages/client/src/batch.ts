import queueMicrotask from '@alloc/queue-microtask'
import { Ref } from 'fauna-lite'
import { agent, Invoker } from './agent'
import { getRefs, getRef } from './common'

type BatchedCall = [string, any[], (result: any) => void]

export type Batch = ReturnType<typeof makeBatch>

/**
 * Batching reduces the number of messages sent to the server
 * by waiting for the next microtask.
 */
export const makeBatch = (invoke: Invoker) => {
  /** Calls to be invoked */
  const calls: BatchedCall[] = []
  /** Changes to be pushed */
  const changes: Change[] = []
  /** Records to start watching */
  const watched = new Set<object>()
  /** Records to stop watching */
  const unwatched = new Set<object>()

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
        if (changes.length) {
          // TODO: space out huge batches
          // TODO: merge changes to the same key
          const patchMap = new Map<Ref, object[]>()
          for (const change of changes) {
            const ref = getRef(change.target)
            if (ref) {
              let patches = patchMap.get(ref)
              if (!patches) {
                patchMap.set(ref, (patches = []))
              }
              const { op, key, value } = change
              patches.push([op, key, value])
            }
          }
          changes.length = 0
          const patches = Array.from(patchMap.entries())
          invoke('ople.push', [patches]).then((rejected: any[]) => {
            // TODO: handle rejected patches
          })
        }
        if (calls.length) {
          calls.forEach(flushCall)
          calls.length = 0
        }
      })
    }
  }

  /** Invoke a batched call */
  function flushCall([action, args, resolve]: BatchedCall) {
    resolve(invoke(action, args))
  }

  return {
    invoke(actionId: string, args: any[]) {
      queueFlush()
      return new Promise<T>(resolve => {
        calls.push([actionId, args, resolve])
      })
    },
    watch(record: object) {
      if (unwatched.has(record)) {
        unwatched.delete(record)
      } else {
        watched.add(record)
        queueFlush()
      }
    },
    unwatch(record: object) {
      if (watched.has(record)) {
        watched.delete(record)
      } else {
        unwatched.add(record)
        queueFlush()
      }
    },
    push(change: Change) {
      changes.push(change)
      queueFlush()
    },
  }
}

function flushSet<T>(set: Set<T>) {
  const values = Array.from(set)
  set.clear()
  return values
}
