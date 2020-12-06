import { FaunaJSON } from 'fauna-lite'
import { socket } from './socket'

export const sendQueue: string[] = []

export function send(actionId: string, args: any[], replyId = '') {
  const payload = FaunaJSON.stringify(args)
  const action = replyId + ':' + actionId + ':' + payload
  console.log('[ople] send: %O', action)
  if (socket.readyState == socket.OPEN) {
    socket.send(action)
  } else {
    sendQueue.push(action)
  }
}
