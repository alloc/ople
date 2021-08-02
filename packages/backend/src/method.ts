import { is } from '@alloc/is'
import { OpleRef } from 'ople-db'
import { Publish, PublishArgs } from './publish'
import * as grip from './grip'

export interface Methods<Context extends object> {
  [key: string]:
    | ((this: MethodContext & Context, ...args: any[]) => any)
    | undefined
}

/** For actions with a deferred response */
export interface MethodResponse {
  /** The number of pending `defer` calls */
  pending: number
  /** Events to send back */
  events: readonly grip.WebSocketEvent[]
  /** Subscriptions to be updated */
  channels: ReadonlyMap<string, boolean>
  /** Subscribe to a channel */
  subscribe: (channel: string) => void
  /** Unsubscribe from a channel */
  unsubscribe: (channel: string) => void
  /** Send an event to the client */
  send: (event: object) => void
  /** Finalize the response */
  end: () => void
}

type TypedString<T> = T & string

class CallerId extends String {}
class UserId extends String {}

export class UserRef<T> extends OpleRef {
  constructor(uid: string, publish: Publish<T>) {
    super(uid, new OpleRef('users', OpleRef.Native.collections))
    return new Proxy(this, {
      get(self, key: keyof OpleRef) {
        if (self[key]) {
          return self[key]
        }
        return (...args: any) => publish(self, key as any, ...args)
      },
    })
  }
}

type SignalTypes = { [name: string]: any }
type SignalTypeConfig = {
  global: SignalTypes
  user: SignalTypes
}

export class MethodContext<Signals, UserSignals> {
  private response?: MethodResponse
  /** The caller identity. */
  readonly cid: TypedString<CallerId>
  /** The user identity. */
  readonly uid?: TypedString<UserId>
  /** Caller metadata set by past calls. */
  readonly meta: Record<string, string>
  readonly user?: UserRef<Signals>
  /** When defined, this call is extended beyond  */
  promise?: Promise<Buffer>

  constructor(
    cid: string,
    uid: string | undefined,
    meta: Record<string, string>
  ) {
    this.cid = new CallerId(cid) as string
    if (is.defined(uid)) {
      this.uid = new UserId(uid) as string
    }
    this.meta = meta
  }

  /** Get the `Ref` for the current user. */
  get user() {
    return q.Ref(q.Collection('users'), this.uid)
  }

  /** Get a publisher for a specific channel. */
  publish(channel: string | OpleRef): Publisher {}

  /** Defer the response indefinitely.  */
  defer(): Readonly<MethodResponse> {
    let res = this.response!
    if (!res) {
      this.promise = new Promise(resolve => {
        this.response = res = makeMethodResponse(resolve)
      })
    }
    res.pending++
    return res
  }
}

function makeMethodResponse(resolve: (buffer: Buffer) => void) {
  const events: grip.WebSocketEvent[] = []
  const channels = new Map<string, boolean>()
  const self: MethodResponse = {
    pending: 0,
    events,
    channels,
    subscribe(name) {
      if (channels.get(name) !== false) {
        channels.set(name, true)
      } else {
        channels.delete(name)
      }
    },
    unsubscribe(name) {
      if (channels.get(name) !== true) {
        channels.set(name, false)
      } else {
        channels.delete(name)
      }
    },
    send(event) {
      events.push(grip.makeTextEvent(FaunaJSON.stringify(event)))
    },
    end() {
      if (--self.pending) return
      if (channels.size) {
        const event = {
          type: null as string | null,
          channel: null as string | null,
        }
        channels.forEach((active, name) => {
          event.type = active ? 'subscribe' : 'unsubscribe'
          event.channel = name
          events.push(grip.makeControlEvent(event))
        })
      }
      resolve(grip.encodeWebSocketEvents(events))
    },
  }
  return self
}
