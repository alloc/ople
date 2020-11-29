import createUid from 'uid'
import queueMicrotask from '@alloc/queue-microtask'
import { is } from '@alloc/is'
import { EventEmitter } from 'ee-ts'
import { FaunaJSON } from 'fauna-lite'

const events = new EventEmitter()

const sendQueue: string[] = []
const replyQueue = new Map<string, ReplyHandler>()

type ReplyHandler = (error: string | null, result?: any) => void
type Reply = [
  /* replyId */ string | 0,
  /* result */ any,
  /* error */ string | undefined
]

export type AgentConfig = {
  /** Defaults to `localhost` */
  host?: string
  /** Defaults to `44301` */
  port?: number
}

const config: Required<AgentConfig> = {
  host: 'localhost',
  port: 7999, // Pushpin port
}

let socket: WebSocket
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
  socket.onmessage = ({ data }) => {
    console.log('[ople] receive: %O', data)
    const [replyId, result, error] = FaunaJSON.parse(data) as Reply
    if (replyId) {
      const onReply = replyQueue.get(replyId)
      if (onReply) {
        onReply(error || null, result)
      }
    }
    // Messages with no `replyId` are remote events.
    else if (is.array(result)) {
      events.emit(...(result as [any]))
    }
  }
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
})

function send(actionId: string, args: any[], replyId = '') {
  const payload = FaunaJSON.stringify(args)
  const action = replyId + ':' + actionId + ':' + payload
  console.log('[ople] send: %O', action)
  if (socket.readyState == socket.OPEN) {
    socket.send(action)
  } else {
    sendQueue.push(action)
  }
}

/** The networking agent that communicates with the server. */
export const agent = {
  /** Update the agent configuration. */
  set(newConfig: Partial<AgentConfig>) {
    if (socket) throw Error('Already connected')
    Object.assign(config, newConfig)
  },
  /** Send a message to the server. */
  send,
  /** Receive messages from the server. */
  events,
}

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
    const replyId = createUid()
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
