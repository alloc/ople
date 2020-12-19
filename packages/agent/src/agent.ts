import { is } from '@alloc/is'
import { uid as makeId } from 'uid'
import type { AgentConfig, UserConfig, Reply, ReplyQueue } from './types'

export { AgentConfig, UserConfig }

export interface Agent {
  readonly host: string
  readonly port: number
  /** The queue of unsent messages */
  readonly sendQueue: string[]
  /** Send a message to the backend. */
  send(actionId: string, args: any[], replyId?: string): void
  /** Call a remote method and wait for a reply. */
  invoke(actionId: string, args: any[]): Promise<any>
}

export type AgentFactory = typeof makeAgent

export function makeAgent({
  protocol: makeTransport,
  host = 'localhost',
  port = 7999,
  encode,
  decode,
  onSignal,
}: AgentConfig): Agent {
  const sendQueue: string[] = []
  const replyQueue: ReplyQueue = new Map()

  const transport = makeTransport({
    host,
    port,
    sendQueue,
    replyQueue,
    onSignal,
    onReply(data) {
      const [replyId, result, error] = JSON.parse(data, decode) as Reply
      if (replyId) {
        const onReply = replyQueue.get(replyId)
        if (onReply) {
          onReply(error || null, result)
        }
      }
      // Non-replies are server-sent events.
      else if (is.array(result)) {
        onSignal(result[0], result.slice(1))
      }
    },
  })

  return {
    host,
    port,
    sendQueue,
    send(actionId, args, replyId = '') {
      const payload = JSON.stringify(args, encode)
      transport.send(replyId + ':' + actionId + ':' + payload)
    },
    invoke(actionId, args) {
      const trace = Error()
      const replyId = makeId()
      return new Promise((resolve, reject) => {
        replyQueue.set(replyId, (error, result) => {
          replyQueue.delete(replyId)
          if (error) {
            trace.message = error
            reject(trace)
          } else {
            resolve(result)
          }
        })
        this.send(actionId, args, replyId)
      })
    },
  }
}
