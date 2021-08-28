import { IncomingMessage, ServerResponse } from 'http'
import readBody from 'raw-body'
import { is } from '@alloc/is'
import { PackedCall } from '@ople/nason'
import { Caller, CallerMeta } from './callees'
import { ServerContext } from './context'
import { processBatch } from './batch'
import { decodeBatch } from './nason'
import * as grip from './grip'

const gripSig = process.env.GRIP_SIG

function validateGripSig(req: IncomingMessage) {
  const gripSigHeader = req.headers['grip-sig']
  return is.string(gripSigHeader) && grip.validateSig(gripSigHeader, gripSig)
}

export interface MiddlewareConfig {
  path?: string
  context: ServerContext
  /** Called when a backend function fails unexpectedly. */
  onError?: (error: Error, call: PackedCall) => void
}

export const createMiddleware = ({
  path,
  context,
  onError,
}: MiddlewareConfig) =>
  async function handleRequest(req: IncomingMessage, res: ServerResponse) {
    let status = 200
    let output: any

    if (validateGripSig(req)) {
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
          const meta: CallerMeta = {}
          for (let [name, value] of Object.entries<any>(req.headers)) {
            if (/^meta-/i.test(name)) {
              name = fromHeaderCase(name.slice(5))
              meta[name] = JSON.parse(value)
            }
          }

          for (const { type, content } of clientEvents) {
            // Handle client-sent messages.
            if (type == grip.TEXT && content) {
              try {
                var [batchId, batch] = decodeBatch(content as Uint8Array)
              } catch {
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

              caller.meta.user = caller.uid
              output = grip.encodeWebSocketEvents(
                events.map(grip.makeControlEvent)
              )
            }
            for (let [name, value] of Object.entries(caller.meta)) {
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
