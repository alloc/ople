import { IncomingMessage, ServerResponse } from 'create-server'
import * as grip from '@fanoutio/grip'
import readBody from 'raw-body'
import { is } from '@alloc/is'
import { isDev } from '@alloc/is-dev'
import { query as q, FaunaJSON } from 'faunadb'
import { printFaunaError, FaunaHTTPError } from './fauna'
import { publish } from './publish'
import { log } from './log'

const gripSig = process.env.GRIP_SIG

function validateGripSig(req: IncomingMessage) {
  const gripSigHeader = req.headers['grip-sig']
  return is.string(gripSigHeader) && grip.validateSig(gripSigHeader, gripSig)
}

const OPEN = 'OPEN'
const CLOSE = 'CLOSE'
const TEXT = 'TEXT'

export function createHandler(methods: Methods) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    let status = 200
    let output: any

    if (validateGripSig(req)) {
      let input: Buffer | undefined
      try {
        input = await readBody(req, {
          length: req.headers['content-length'],
        })
      } catch (err) {
        status = err.statusCode
        output = err.message
      }
      if (input) {
        const events = grip.decodeWebSocketEvents(input)
        if (events.length) {
          let ctx: MethodContext | undefined
          let opened = false

          res.setHeader('Content-Type', 'application/websocket-events')

          const cid = req.headers['connection-id'] as string
          const uid = (req.headers['meta-user'] || '') as string

          events.forEach(async ({ type, content }) => {
            // Handle client-sent messages.
            if (type == TEXT && content) {
              if (!ctx) ctx = new MethodContext(cid, uid)
              try {
                var [replyId, actionId, args] = parseMethodCall(
                  content.toString('utf8')
                )
                const action = methods[actionId]
                if (!action) {
                  throw 'Unsupported action'
                }
                const result = await action.apply(ctx, args)
                if (replyId) {
                  resolve(ctx, replyId, result)
                }
              } catch (error) {
                if (is.string(error)) {
                  if (replyId) {
                    reject(ctx, replyId, error)
                  } else if (isDev) {
                    log.warn('Action failed:', { actionId, args, error })
                  }
                } else {
                  if (error instanceof FaunaHTTPError) {
                    printFaunaError(error)
                  } else {
                    onError(error)
                  }
                  if (replyId) {
                    reject(ctx, replyId, 'Unexpected error')
                  }
                }
              }
            }

            // Handle new connections.
            else if (type == OPEN) {
              opened = true
              res.setHeader(
                'Sec-WebSocket-Extensions',
                'grip; message-prefix=""'
              )
            }

            // Handle lost connections.
            else if (type == CLOSE) {
              // TODO: notify server hook for tracking online status of users
            }
          })

          if (opened) {
            const events = grip.encodeWebSocketEvents([
              makeControlEvent({
                type: 'subscribe',
                channel: 'c:' + cid,
              }),
            ])

            // Assume the OPEN event is always alone.
            output = Buffer.concat(
              [input, events],
              input.length + events.length
            )
          } else if (ctx) {
            output = await ctx.promise

            // Update the user identity.
            if (ctx.uid !== uid) {
              res.setHeader('Set-Meta-User', ctx.uid || '')
              log('uid: %O', ctx.uid)
            }
          }
        }
      }
    } else {
      status = 401
      output = 'Invalid grip-sig token'
    }

    res.writeHead(status)
    if (output) {
      res.write(output)
    }
    res.end()
  }
}

const methodCallRE = /^([^:]*):([^:]+):(.+)$/

function parseMethodCall(text: string) {
  const match = methodCallRE.exec(text)
  if (match) {
    const payload: any[] = FaunaJSON.parse(match[3])
    return [match[1], match[2], payload] as const
  }
  throw 'Malformed method call'
}

export interface Methods {
  [key: string]: ((this: MethodContext, ...args: any[]) => any) | undefined
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

export class MethodContext {
  private response?: MethodResponse
  promise?: Promise<Buffer>

  constructor(
    /** The connection identity. */
    readonly cid: string,
    /** The user identity. */
    public uid: string
  ) {}

  /** Get the `Ref` for the current user. */
  get user() {
    return q.Ref(q.Collection('users'), this.uid)
  }

  /** Push content to the current connection. */
  push(content: object) {
    return publish('c:' + this.cid, content)
  }

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

const makeTextEvent = (data: string) => new grip.WebSocketEvent(TEXT, data)
const makeControlEvent = (props: object) =>
  makeTextEvent('c:' + JSON.stringify(props))

const makeMethodResponse = (resolve: (buffer: Buffer) => void) => {
  const events: grip.WebSocketEvent[] = []
  const channels = new Map<string, boolean>()
  const res: MethodResponse = {
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
      events.push(makeTextEvent(FaunaJSON.stringify(event)))
    },
    end() {
      if (--res.pending) return
      if (channels.size) {
        const event = {
          type: null as string | null,
          channel: null as string | null,
        }
        channels.forEach((active, name) => {
          event.type = active ? 'subscribe' : 'unsubscribe'
          event.channel = name
          events.push(makeControlEvent(event))
        })
      }
      resolve(grip.encodeWebSocketEvents(events))
    },
  }
  return res
}

const onError = (err: Error) => log.error(err)

/** Resolve a pending request */
function resolve(ctx: MethodContext, replyId: string, result: any) {
  ctx.push(result !== void 0 ? [replyId, result] : [replyId]).catch(onError)
}

/** Reject a pending request */
function reject(ctx: MethodContext, replyId: string, error: string) {
  ctx.push([replyId, 0, error]).catch(onError)
}
