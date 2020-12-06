import { uid as makeId } from 'uid'
import { send } from './send'
import { replyQueue } from './onReply'

/** Invokers talk to the `@ople/server` layer, sending requests and handling replies. */
export type Invoker = (actionId: string, args: any[]) => Promise<any>

/**
 * Create an `invoke` function with interceptors.
 *
 * The `onInvoke` interceptor can mutate the `args` array to provide
 * transparent encoding of specialized objects.
 *
 * The `onReply` interceptor can replace the `result` value with its
 * own value, which is useful for transparent decoding.
 */
export const makeInvoker = (
  onInvoke: (actionId: string, args: any[]) => void,
  onReply: (result: any) => any
): Invoker =>
  /** Call a remote method and wait for a reply */
  function invoke(actionId, args) {
    const trace = new Error()
    const replyId = makeId()
    return new Promise((resolve, reject) => {
      replyQueue.set(replyId, (error, result) => {
        replyQueue.delete(replyId)
        if (error) {
          trace.message = error
          reject(trace)
        } else {
          resolve(onReply(result))
        }
      })
      onInvoke(actionId, args)
      send(actionId, args, replyId)
    })
  }
