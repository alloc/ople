import { Protocol } from '../types'

declare const console: any

export const ws: Protocol = ({
  host,
  port,
  onReply,
  onConnect,
  onDisconnect,
}) => {
  const isLocal = host == 'localhost'
  const socket = new WebSocket(
    `ws${isLocal ? '' : 's'}://${host}${isLocal ? ':' + port : ''}`
  )
  socket.binaryType = 'arraybuffer'
  socket.onmessage = event => onReply(new Uint8Array(event.data))
  socket.onerror = event => {
    // TODO: proper handling
    console.error(event)
    if (socket.readyState == socket.CLOSED) {
      // TODO: exponential retry if network down
    }
  }

  let isConnected = false
  socket.onopen = () => {
    isConnected = true
    onConnect()
  }
  socket.onclose = () => {
    isConnected = false
    onDisconnect()
    // TODO: reconnect
  }

  return {
    canSend: () => isConnected,
    send(action) {
      if (socket.readyState == socket.OPEN) {
        socket.send(action)
      } else {
        throw Error('Not connected')
      }
    },
  }
}

declare class WebSocket {
  constructor(baseURL: string)
  OPEN: number
  CLOSED: number
  binaryType: string
  readyState: number
  send(data: ArrayBufferLike): void
  onopen: () => void
  onmessage: (event: { data: ArrayBufferLike }) => void
  onclose: () => void
  onerror: (event: any) => void
}
