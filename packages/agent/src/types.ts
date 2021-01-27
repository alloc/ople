import { Deferred } from 'ts-deferred'

export interface AgentConfig {
  /** The transport strategy. Pass the `ws` or `http` export, or provide your own. */
  protocol: Protocol
  /** Defaults to `"localhost"` */
  host?: string
  /** Defaults to `7999` */
  port?: number
}

/** A transport strategy used by `@ople/agent` */
export interface Protocol {
  (config: TransportConfig): Transport
}

/** @internal */
export type TransportConfig = {
  readonly host: string
  readonly port: number
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

export type FetchQueue<Record> = RefMap<Deferred<Record>>

export type PackedCall = [method: string, args: any[] | null, replyId: string]

export type OpleMethod =
  | '@push'
  | '@pull'
  | '@watch'
  | '@unwatch'
  | '@create'
  | '@delete'
  | '@get'

export type Ref = { id: string }
export type RefMap<T> = { [ref: string]: T }

export type Patch = { [key: string]: any }

export type Batch<Record> = { [method: string]: Set<any> } & {
  [P in OpleMethod]: Set<P extends '@get' ? Ref : Record>
} & {
    id: string
    calls: PackedCall[]
    patches: RefMap<Patch> | null
    fetches: RefMap<Deferred<Record>>
    promise: Promise<void>
    resolve: (value?: PromiseLike<void>) => void
  }
