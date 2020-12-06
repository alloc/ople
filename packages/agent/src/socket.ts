import queueMicrotask from '@alloc/queue-microtask'
import { config } from './config'
import { sendQueue } from './send'
import { replyQueue } from './onReply'

export let socket: WebSocket

queueMicrotask(() => {
  const secure = config.host !== 'localhost'
  let baseURL = `ws${secure ? 's' : ''}://${config.host}`
  if (config.host == 'localhost') {
    baseURL += ':' + config.port
  }
  socket = new WebSocket(baseURL)
  socket.onopen = () => {
    console.log('[ople] connected')
    // TODO: resubscribe to all watched documents
    // TODO: batch these messages into one send?
    sendQueue.forEach(msg => socket.send(msg))
  }
  socket.onmessage = event =>
    (socket.onclose = () => {
      // TODO: reconnect
      replyQueue.forEach(resolve => {
        resolve('Lost connection')
      })
    })
  socket.onerror = event => {
    // TODO: proper handling
    console.error(event)
    if (socket.readyState == socket.CLOSED) {
      // TODO: exponential retry if network down
    }
  }
})

declare class WebSocket {
  constructor(baseURL: string)
  OPEN: number
  CLOSED: number
  readyState: number
  send(data: string): void
  onopen: () => void
  onmessage: (event: { data: any }) => void
  onclose: () => void
  onerror: (event: any) => void
}
