import { is } from '@alloc/is'
import { PackedCall } from '@ople/nason'
import { ZodError } from 'zod'
import { invokeFunction } from './invoke'
import { coreFunctions } from './core'
import { Caller } from './callees'
import { log } from './log'

export type BatchError = {
  batch: PackedCall[]
  callIndex: number
  reason: string
}

export function processBatch(
  caller: Caller,
  batchId: string,
  batch: PackedCall[],
  onError: (error: Error, call: PackedCall) => void = logError
): Promise<BatchError | undefined> {
  const {
    id: callerId,
    context: { resolve, reject, batchQueues },
  } = caller

  let failed = false
  let callIndex = -1
  let batchPromise = Promise.resolve(batchQueues[callerId])
  batchPromise = batchPromise.then(async () => {
    try {
      let callPromise: Promise<any> = Promise.resolve()
      for (let i = 0; i < batch.length; i++) {
        const call = batch[i],
          [calleeId, args, replyId] = call

        // Core functions run in parallel.
        const coreFunction = coreFunctions[calleeId]
        if (coreFunction) {
          callIndex = i
          callPromise = Promise.resolve(coreFunction(caller, ...args!)).then(
            bindResult(callPromise),
            error => {
              if (!failed) {
                failed = true
                callIndex = i
                throw error
              }
              // TODO: wait for all built-in calls to finish, then send all
              //   of their errors to the client.
              if (is.error(error)) onError(error, call)
              else log.error(error, call)
            }
          )
        } else {
          await callPromise
          callIndex = i
          callPromise = invokeFunction(caller, calleeId, args)
          if (replyId) {
            callPromise = callPromise.then(
              result => {
                if (is.undefined(result)) {
                  result = null
                }
                resolve(callerId, replyId, result)
              },
              error => {
                reject(callerId, replyId, error)
              }
            )
          }
        }
      }
      await callPromise
      resolve(callerId, batchId, null)
    } catch (error: any) {
      if (is.error(error)) {
        onError(error, batch[callIndex])
        error =
          error instanceof ZodError
            ? `Invalid argument: ` + error.issues[0].path.join('.')
            : `` // Keep the error secret.
      }
      throw {
        batch,
        callIndex,
        reason: error,
      }
    }
  })

  batchQueues[callerId] = batchPromise
  return batchPromise
    .catch(error => {
      if (error.batch == batch)
        reject(
          callerId,
          batchId,
          JSON.stringify({
            reason: error.reason,
            callIndex,
          })
        )

      // Return the error, even if it's not ours.
      return error
    })
    .finally(() => {
      if (batchPromise == batchQueues[callerId]) {
        delete batchQueues[callerId]
      }
    })
}

function logError(error: any, call: PackedCall) {
  error.call = call
  log.error(error)
}

function bindResult(arg: any) {
  return () => arg
}
