import type { ViteDevServer } from 'vite'
import jwt from 'jsonwebtoken'
import { uid } from 'uid'
import { warnOnce } from 'misty'
import WebSocket from 'ws'
import readBody from 'raw-body'
import Interlocutor from 'interlocutor'
import {
  decodeWebSocketEvents,
  encodeWebSocketEvents,
  WebSocketEvent,
} from '@fanoutio/grip'

export interface ServerOptions extends Omit<WebSocket.ServerOptions, 'server'> {
  gripSecret: string
  originUrl: string
  server: ViteDevServer
}

export interface Pushpin extends WebSocket.Server {
  /** Push bytes to a connection. */
  push: (cid: string, data: Uint8Array) => void
  /** Publish bytes to a channel. */
  publish: (channel: string, data: Uint8Array) => void
  /** Subscribe a connection to a channel. */
  subscribe: (cid: string, channel: string) => void
  /** Unsubscribe a connection from a channel. */
  unsubscribe: (cid: string, channel: string) => void
}

export function createPushpin({
  gripSecret,
  originUrl,
  server,
  ...options
}: ServerOptions) {
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

  const gateway = createGateway(
    gripSecret,
    originUrl,
    state,
    server.middlewares
  )
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
        new WebSocketEvent(
          typeof content == 'string' ? 'TEXT' : 'BINARY',
          content as any
        ),
      ])
    })
  })

  return Object.assign(wss as Pushpin, <Pushpin>{
    push(connectionId, data) {
      state.connections[connectionId]?.socket.send(data)
    },
    publish(channelId, data) {
      state.channels[channelId]?.forEach(connectionId => {
        state.connections[connectionId].socket.send(data)
      })
    },
    subscribe(connectionId, channelId) {
      subscribe(state, connectionId, channelId)
    },
    unsubscribe(connectionId, channelId) {
      unsubscribe(state, connectionId, channelId)
    },
  })
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
  gripSecret: string,
  originUrl: string,
  state: GripState,
  handler: (req: any, res: any) => void
) {
  const agent = new Interlocutor(handler)
  return {
    forward(connectionId: string, events: WebSocketEvent[]) {
      const connection = state.connections[connectionId]
      const payload = encodeWebSocketEvents(events)
      const req = agent.request({
        path: originUrl,
        method: 'POST',
        headers: {
          'content-length': '' + Buffer.byteLength(payload),
          'connection-id': connectionId,
          'grip-sig': generateGripSig(gripSecret),
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
            warnOnce(`[pushpin] "${name}" header is not implemented`)
          }
        }
        const body = await readBody(res as any)
        const events = decodeWebSocketEvents(body)
        for (const event of events) {
          if (event.type === 'TEXT') {
            const text = event.content as string
            if (text.startsWith('c:')) {
              const { type, channel } = JSON.parse(text.slice(2))

              // Subscribe
              if (type === 'subscribe') {
                subscribe(state, connectionId, channel)
              }
              // Unsubscribe
              else if (type === 'unsubscribe') {
                unsubscribe(state, connectionId, channel)
              }
              // Invalid
              else {
                warnOnce(`[pushpin] "${type}" is an invalid control event`)
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

function subscribe(state: GripState, connectionId: string, channelId: string) {
  const connection = state.connections[connectionId]
  if (connection) {
    const channel =
      state.channels[channelId] || (state.channels[channelId] = new Set())
    connection.channels.add(channelId)
    channel.add(connectionId)
  }
}

function unsubscribe(
  state: GripState,
  connectionId: string,
  channelId: string
) {
  const channel = state.channels[channelId]
  const connection = state.connections[connectionId]
  if (channel && connection) {
    connection.channels.delete(channelId)
    removeFromNestedSet(state.channels, channelId, connectionId)
  }
}

function newConnectionId(connections: Record<GripConnectionId, any>) {
  for (let id: string; ; )
    if (!connections[(id = uid(8))]) {
      return id
    }
}

function generateGripSig(secret: string) {
  return jwt.sign(
    { iss: 'pushpin', exp: Math.ceil(Date.now() / 1000) + 3600 },
    secret
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
