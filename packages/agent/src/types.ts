export type Ref = string & {
  readonly id: string
  readonly collection: Collection
}

export type Collection = {
  readonly id: string
}

export interface AgentConfig {
  /** The transport strategy. Pass the `ws` or `http` export, or provide your own. */
  protocol: Protocol
  /** Where the Ople server is located. */
  url: string
}

/** A transport strategy used by `@ople/agent` */
export interface Protocol {
  (config: TransportConfig): Transport
}

/** @internal */
export type TransportConfig = {
  readonly url: string
  readonly onReply: (data: Uint8Array) => void
  readonly onConnect: () => void
  readonly onDisconnect: () => void
}

/** @internal */
export interface Transport {
  canSend(): boolean
  send(data: Uint8Array): void
}

export type ReplyHandler = (error: string | null, result?: any) => void
export type ReplyQueue = Map<string, ReplyHandler>

export type PackedCall = [method: string, args: any[] | null, replyId: string]

export type RefMap<T> = { [ref: string]: T }

export type Patch = { [key: string]: any }

export type Deferred = {
  promise: Promise<void>
  resolve: (value?: PromiseLike<void>) => void
}

export type BatchLike = Deferred & {
  id: string
}
