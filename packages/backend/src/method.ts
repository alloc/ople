import { query as q, FaunaJSON } from 'faunadb'
import { Publish, publish, PublishArgs } from './publish'
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

export class MethodContext<T> {
  private response?: MethodResponse
  promise?: Promise<Buffer>

  constructor(
    /** The connection identity. */
    readonly cid: string,
    /** The user identity. */
    public uid: string | undefined,
    /** For sending events to the connection. */
    publish: Publish<T>
  ) {
    this.emit = publish.bind(null, 'c:' + cid) as any
  }

  /** Get the `Ref` for the current user. */
  get user() {
    return q.Ref(q.Collection('users'), this.uid)
  }

  /** Send an event to the method caller. */
  readonly emit: <E extends keyof T>(
    event: E,
    ...args: PublishArgs<T[E]>
  ) => Promise<void>

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
