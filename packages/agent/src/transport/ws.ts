import { Protocol } from '../types'

declare const console: any

export const ws: Protocol = ({
  host,
  port,
  sendQueue,
  replyQueue,
  onReply,
}) => {
  const isLocal = host == 'localhost'
  const socket = new WebSocket(
    `ws${isLocal ? '' : 's'}://${host}${isLocal ? ':' + port : ''}`
  )
  socket.onopen = () => {
    console.log('[ople] connected')
    // TODO: resubscribe to all watched documents
    // TODO: batch these messages into one send?
    sendQueue.forEach(msg => socket.send(msg))
    sendQueue.length = 0
  }
  socket.onmessage = event => onReply(event.data)
  socket.onclose = () => {
    // TODO: reconnect
    replyQueue.forEach(resolve => {
      resolve('Lost connection')
    })
  }
  socket.onerror = event => {
    // TODO: proper handling
    console.error(event)
    if (socket.readyState == socket.CLOSED) {
      // TODO: exponential retry if network down
    }
  }
  return {
    send(action) {
      if (socket.readyState == socket.OPEN) {
        socket.send(action)
      } else {
        sendQueue.push(action)
      }
    },
  }
}

declare class WebSocket {
  constructor(baseURL: string)
  OPEN: number
  CLOSED: number
  readyState: number
  send(data: string): void
  onopen: () => void
  onmessage: (event: { data: string }) => void
  onclose: () => void
  onerror: (event: any) => void
}
