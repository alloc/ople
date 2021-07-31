import type { ViteDevServer } from 'vite'
import jwt from 'jsonwebtoken'
import { uid } from 'uid'
import WebSocket from 'ws'
import readBody from 'raw-body'
import Interlocutor from 'interlocutor'
import {
  decodeWebSocketEvents,
  encodeWebSocketEvents,
  WebSocketEvent,
} from '@fanoutio/grip'

export interface ServerOptions extends Omit<WebSocket.ServerOptions, 'server'> {
  server: ViteDevServer
}

export function createServer({ server, ...options }: ServerOptions) {
  if (!server.httpServer) {
    throw Error('Incompatible with middleware mode')
  }

  const wss = new WebSocket.Server({
    ...options,
    server: server.httpServer,
  })

  const state: GripState = {
    connections: {},
    channels: {},
  }

  const gateway = createGateway(state, server.middlewares)
  wss.on('connection', socket => {
    let connectionId: string
    const connection: GripConnection = { meta: {}, channels: new Set(), socket }

    socket.on('open', () => {
      connectionId = newConnectionId(state.connections)
      state.connections[connectionId] = connection
      gateway.forward(connectionId, [new WebSocketEvent('OPEN')])
    })

    socket.on('close', () => {
      gateway.forward(connectionId, [new WebSocketEvent('CLOSE')])
      delete state.connections[connectionId]
      for (const channelId of connection.channels) {
        removeFromNestedSet(state.channels, channelId, connectionId)
      }
    })

    socket.on('message', content => {
      gateway.forward(connectionId, [
        new WebSocketEvent('TEXT', content.toString('utf8')),
      ])
    })
  })

  return wss
}

type GripConnectionId = string
type GripChannelId = string

interface GripState {
  connections: Record<GripConnectionId, GripConnection>
  channels: Record<GripChannelId, Set<GripConnectionId>>
}

interface GripConnection {
  meta: Record<string, string>
  channels: Set<GripChannelId>
  socket: WebSocket
}

const todoHeaders = [
  'Grip-Channel',
  'Grip-Hold',
  'Grip-Timeout',
  'Grip-Keep-Alive',
]

function createGateway(
  state: GripState,
  handler: (req: any, res: any) => void
) {
  const agent = new Interlocutor(handler)
  return {
    forward(connectionId: string, events: WebSocketEvent[]) {
      const connection = state.connections[connectionId]
      const payload = encodeWebSocketEvents(events)
      const req = agent.request({
        path: '/@ople-dev',
        method: 'POST',
        headers: {
          'content-length': '' + Buffer.byteLength(payload),
          'connection-id': connectionId,
          'grip-sig': generateGripSig(),
          ...connection.meta,
        },
      })
      req.on('response', async res => {
        for (const name in res.headers) {
          // Set connection metadata
          if (name.startsWith('Set-Meta-')) {
            const key = name.slice(4)
            connection.meta[key] = res.headers[name]
          }
          // Unsupported header
          else if (todoHeaders.includes(name)) {
            console.warn(name + ' not implemented')
          }
        }
        const body = await readBody(res as any)
        const events = decodeWebSocketEvents(body)
        for (const event of events) {
          if (event.type === 'TEXT') {
            const text = event.content as string
            if (text.startsWith('c:')) {
              const { type, channel: channelId } = JSON.parse(text.slice(2))
              let channel = state.channels[channelId]

              // Subscribe
              if (type === 'subscribe') {
                connection.channels.add(channelId)
                channel ||= state.channels[channelId] = new Set()
                channel.add(connectionId)
              }
              // Unsubscribe
              else if (type === 'unsubscribe') {
                connection.channels.delete(channelId)
                if (channel) {
                  removeFromNestedSet(state.channels, channelId, connectionId)
                }
              }
              // Invalid
              else {
                console.warn('Invalid control event: %O', type)
              }
            }
            // Message
            else {
              connection.socket.send(text)
            }
          }
        }
      })
      req.write(payload)
      req.end()
    },
  }
}

function newConnectionId(connections: Record<GripConnectionId, any>) {
  for (let id: string; ; )
    if (!connections[(id = uid(8))]) {
      return id
    }
}

function generateGripSig() {
  return jwt.sign(
    { iss: 'pushpin', exp: Math.ceil(Date.now() / 1000) + 3600 },
    process.env.GRIP_SIG || ''
  )
}

function removeFromNestedSet(ns: any, key1: any, key2: any) {
  const set = ns[key1]
  if (set.size > 1) {
    set.delete(key2)
  } else {
    delete ns[key1]
  }
}
