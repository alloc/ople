export interface UserConfig {
  /** The transport strategy. Pass the `ws` or `http` export, or provide your own. */
  protocol: Protocol
  /** Defaults to `"localhost"` */
  host?: string
  /** Defaults to `7999` */
  port?: number
}

export interface AgentConfig extends UserConfig {
  /** Encoding logic for JSON values. */
  encode: (this: any, key: string, val: any) => any
  /** Decoding logic for JSON values. */
  decode: (this: any, key: string, val: any) => any
  /** Receive signals from the backend. */
  onSignal: (name: string, args: any[]) => void
}

/** A transport strategy used by `@ople/agent` */
export interface Protocol {
  (config: TransportConfig): Transport
}

/** @internal */
export type TransportConfig = {
  readonly host: string
  readonly port: number
  /** Pending messages to the backend */
  readonly sendQueue: string[]
  /** Pending reply handlers */
  readonly replyQueue: ReplyQueue
  /** Process a message from the backend. */
  readonly onReply: (data: string) => void
  /** Send a transport-specific signal to the client. */
  readonly onSignal: (name: string, args: any[]) => void
}

/** @internal */
export interface Transport {
  send(action: string): void
}

/** @internal */
export type Reply = [
  replyId: string | 0,
  result: any,
  error: string | undefined
]

/** @internal */
export type ReplyHandler = (error: string | null, result?: any) => void

/** @internal */
export type ReplyQueue = Map<string, ReplyHandler>
