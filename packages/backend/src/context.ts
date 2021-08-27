import { encodeReply } from './nason'
import { dump } from 'tnetstring'
import { BatchError } from './batch'

export interface ServerContext {
  /** Batch queues for predictable ordering */
  batchQueues: {
    [channel: string]: Promise<void> | undefined
  }
  /** Resolve a backend call. */
  resolve: (cid: string, replyId: string, reply: any) => void
  /** Reject a backend call. */
  reject: (cid: string, replyId: string, error: string) => void
  /** Send a signal to a channel. */
  publish: (channel: string, name: string, args?: any[]) => void
  /** Subscribe a connection to a channel. */
  subscribe: (cid: string, channel: string) => void
  /** Unsubscribe a connection from a channel. */
  unsubscribe: (cid: string, channel: string) => void
}

interface OriginConfig
  extends Pick<ServerContext, 'subscribe' | 'unsubscribe'> {
  /** Push bytes to a connection. */
  push: (cid: string, data: Uint8Array) => void
  /** Publish bytes to a channel. */
  publish: (channel: string, data: Uint8Array) => void
}

/**
 * Broadcast to clients without Pushpin as a middle man.
 * Every client connects directly to the origin server.
 *
 * The dev server uses this.
 */
export const makeOriginContext = ({
  push,
  publish,
  subscribe,
  unsubscribe,
}: OriginConfig): ServerContext => ({
  batchQueues: {},
  resolve(cid, replyId, reply) {
    push(cid, encodeReply(replyId, reply))
  },
  reject(cid, replyId, error) {
    push(cid, encodeReply(replyId, null, error))
  },
  publish(channel, name, args) {
    publish(channel, encodeReply('', args ? [name, args] : [name]))
  },
  subscribe,
  unsubscribe,
})

interface PushpinConfig {}

/**
 * Broadcast to clients via the Websocket-to-HTTP protocol
 * pioneered by Pushpin. Every client connects to a Pushpin
 * node, which decouples horizontal scaling of the websocket
 * layer from the proverbial "business logic" layer.
 */
export const makePushpinContext = (): ServerContext => ({
  batchQueues: {},
  resolve(cid, replyId, reply) {},
  reject(cid, replyId, error) {},
  publish(channel, signalId, args) {},
  subscribe(cid, channel) {},
  unsubscribe(cid, channel) {},
})
