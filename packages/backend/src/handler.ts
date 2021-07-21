import { IncomingMessage, ServerResponse } from 'http'
import readBody from 'raw-body'
import { is } from '@alloc/is'
import { isDev } from '@alloc/is-dev'
import { FaunaJSON } from 'faunadb'
import { printFaunaError, FaunaHTTPError } from './fauna'
import type { OpleService } from './service'
import { MethodContext } from './method'
import { log } from './log'
import * as grip from './grip'

const gripSig = process.env.GRIP_SIG

function validateGripSig(req: IncomingMessage) {
  const gripSigHeader = req.headers['grip-sig']
  return is.string(gripSigHeader) && grip.validateSig(gripSigHeader, gripSig)
}

export const services = new Set<OpleService<any>>()

function findService(path: string) {
  for (const service of services) {
    if (service.path === path) {
      return service
    }
  }
}

export async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  next?: () => void
) {
  let status = 200
  let output: any

  const service = findService(req.url!)
  if (!service) {
    if (next) {
      return next()
    }
    status = 404
  } else if (validateGripSig(req)) {
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
        const meta: Record<string, string | undefined> = {}
        for (const name in req.headers) {
          if (/^meta-/i.test(name)) {
            log('meta: %O = %O', name, req.headers[name])
            meta[name.slice(5)] = req.headers[name] as string
          }
        }

        events.forEach(async ({ type, content }) => {
          // Handle client-sent messages.
          if (type == grip.TEXT && content) {
            try {
              var [replyId, actionId, args] = parseMethodCall(
                content.toString('utf8')
              )
              const authorized = await service.authorize(
                meta,
                req.headers,
                actionId
              )
              if (!authorized) {
                throw 'Unauthorized action'
              }
              if (!ctx) {
                ctx = new MethodContext(cid, meta.user)
                await service.applyContext(ctx, meta, actionId)
              }
              const action = service.methods[actionId]
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
                  reject(ctx!, replyId, error)
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
                  reject(ctx!, replyId, 'Unexpected error')
                }
              }
            }
          }

          // Handle new connections.
          else if (type == grip.OPEN) {
            opened = true
            res.setHeader('Sec-WebSocket-Extensions', 'grip; message-prefix=""')
          }

          // Handle lost connections.
          else if (type == grip.CLOSE) {
            // TODO: notify server hook for tracking online status of users
          }
        })

        if (opened) {
          const events = grip.encodeWebSocketEvents([
            grip.makeControlEvent({
              type: 'subscribe',
              channel: 'c:' + cid,
            }),
          ])

          // Assume the OPEN event is always alone.
          output = Buffer.concat([input, events], input.length + events.length)
        } else if (ctx) {
          output = await ctx.promise

          // Update the user identity.
          if (ctx.uid !== meta.user) {
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

const methodCallRE = /^([^:]*):([^:]+):(.+)$/

function parseMethodCall(text: string) {
  const match = methodCallRE.exec(text)
  if (match) {
    const payload: any[] = FaunaJSON.parse(match[3])
    return [match[1], match[2], payload] as const
  }
  throw 'Malformed method call'
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
