import { IncomingMessage, ServerResponse } from 'http'
import readBody from 'raw-body'
import { is } from '@alloc/is'
import { PackedCall } from '@ople/nason'
import { Caller } from './callees'
import { ServerContext } from './context'
import { processBatch } from './batch'
import { decodeBatch } from './nason'
import * as grip from './grip'

function validateGripSig(req: IncomingMessage, gripSecret: string) {
  const gripSigHeader = req.headers['grip-sig']
  return is.string(gripSigHeader) && grip.validateSig(gripSigHeader, gripSecret)
}

export interface MiddlewareConfig {
  context: ServerContext
  gripSecret: string
  /** Called when a backend function fails unexpectedly. */
  onError?: (error: Error, call: PackedCall) => void
}

export const createMiddleware = ({
  context,
  gripSecret,
  onError,
}: MiddlewareConfig) =>
  async function handleRequest(req: IncomingMessage, res: ServerResponse) {
    let status = 200
    let output: any

    if (validateGripSig(req, gripSecret)) {
      let input: Buffer | undefined
      try {
        input = await readBody(req, {
          length: req.headers['content-length'],
        })
      } catch (err: any) {
        status = err.statusCode
        output = err.message
      }
      if (input) {
        const clientEvents = grip.decodeWebSocketEvents(input)
        if (clientEvents.length) {
          let caller: Caller | undefined
          let opened = false

          res.setHeader('Content-Type', 'application/websocket-events')

          const cid = req.headers['connection-id'] as string
          const meta = parseCallerMeta(req.headers)
          meta.user ??= ''

          for (const { type, content } of clientEvents) {
            // Handle client-sent messages.
            if (type == grip.BINARY && content) {
              try {
                var [batchId, batch] = decodeBatch(content as Uint8Array)
              } catch (err) {
                console.error(err)
                status = 400
                output = 'Malformed batch'
                break
              }
              caller ||= new Caller(cid, meta, context)
              await processBatch(caller, batchId, batch, onError)
            }

            // Handle new connections.
            else if (type == grip.OPEN) {
              opened = true
              res.setHeader(
                'Sec-WebSocket-Extensions',
                'grip; message-prefix=""'
              )
            }

            // Handle lost connections.
            else if (type == grip.CLOSE) {
              // TODO: notify server hook for tracking online status of users
            }
          }

          // Assume the OPEN event is always alone.
          if (opened) {
            const response = grip.encodeWebSocketEvents([
              // For connection-specific events:
              grip.makeControlEvent({
                type: 'subscribe',
                channel: 'c:' + cid,
              }),
              // For global events:
              grip.makeControlEvent({
                type: 'subscribe',
                channel: '*',
              }),
            ])
            output = Buffer.concat(
              [input, response],
              input.length + response.length
            )
          } else if (caller) {
            const metaEntries = Object.entries(caller.meta)
            if (caller.uid !== meta.user) {
              const events: object[] = []

              if (caller.uid)
                events.push({
                  type: 'subscribe',
                  channel: 'u:' + caller.uid,
                })

              if (meta.user)
                events.push({
                  type: 'unsubscribe',
                  channel: 'u:' + meta.user,
                })

              metaEntries.push(['user', caller.uid])
              output = grip.encodeWebSocketEvents(
                events.map(grip.makeControlEvent)
              )
            }
            for (let [name, value] of metaEntries) {
              if (value !== meta[name]) {
                name = toHeaderCase(name)
                res.setHeader('Set-Meta-' + name, JSON.stringify(value))
              }
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

const fromHeaderCase = (input: string) =>
  input.replace(/(^[A-Z]|-)/g, ch => (ch == '-' ? '' : ch.toLowerCase()))

const toHeaderCase = (input: string) =>
  input.replace(/(^[a-z]|[A-Z])/g, ch =>
    ch <= 'Z' ? '-' + ch : ch.toUpperCase()
  )

const parseCallerMeta = (headers: Record<string, any>) =>
  Object.entries(headers).reduce((meta: Record<string, any>, [name, value]) => {
    if (/^meta-/i.test(name)) {
      name = fromHeaderCase(name.slice(5))
      meta[name] = JSON.parse(value)
    }
    return meta
  }, {})
