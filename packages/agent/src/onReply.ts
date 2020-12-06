import { is } from '@alloc/is'
import { FaunaJSON } from 'fauna-lite'
import { config } from './config'

type Reply = [replyId: string | 0, result: any, error: string | undefined]
type ReplyHandler = (error: string | null, result?: any) => void

export const replyQueue = new Map<string, ReplyHandler>()

export function onReply(data: string) {
  console.log('[ople] receive: %O', data)
  const [replyId, result, error] = FaunaJSON.parse(data) as Reply
  if (replyId) {
    const onReply = replyQueue.get(replyId)
    if (onReply) {
      onReply(error || null, result)
    }
  }
  // Anonymous replies are server-sent events.
  else if (is.array(result)) {
    config.onSignal!(result[0], result.slice(1))
  }
}
