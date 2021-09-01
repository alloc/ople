import * as http from 'http'
import fetch, { Headers } from 'node-fetch'
import jwt from 'jsonwebtoken'
import rawBody from 'raw-body'
import { uid } from 'uid'
import { warnOnce } from 'misty'
import WebSocket from 'ws'
import {
  decodeWebSocketEvents,
  encodeWebSocketEvents,
  WebSocketEvent,
} from '@fanoutio/grip'

export interface ServerOptions extends Omit<WebSocket.ServerOptions, 'server'> {
  gripSecret: string
  originUrl: string
  server: http.Server
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
  ...options
}: ServerOptions) {
  const wss = new WebSocket.Server(options)

  const state: GripState = {
    connections: {},
    channels: {},
  }

  const gateway = createGateway(gripSecret, originUrl, state)
  wss.on('connection', socket => {
    const connectionId = newConnectionId(state.connections)
    const connection: GripConnection = {
      meta: {},
      channels: new Set(),
      socket,
    }

    state.connections[connectionId] = connection
    gateway.forward(connectionId, [new WebSocketEvent('OPEN')])

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
  state: GripState
) {
  return {
    async forward(connectionId: string, events: WebSocketEvent[]) {
      const connection = state.connections[connectionId]
      const payload = encodeWebSocketEvents(events)
      const resp = await fetch(originUrl, {
        method: 'POST',
        body: payload,
        headers: new Headers({
          'connection-id': connectionId,
          'grip-sig': generateGripSig(gripSecret),
          ...connection.meta,
        }),
      })
      const body = await rawBody(resp.body as any)
      if (!resp.ok) {
        return console.error(body.toString('utf8'), events)
      }
      resp.headers.forEach((value, name) => {
        // Set connection metadata
        if (/set-meta-/i.test(name)) {
          const key = name.slice(4)
          connection.meta[key] = value
        }
        // Unsupported header
        else if (todoHeaders.includes(name)) {
          warnOnce(`[pushpin] "${name}" header is not implemented`)
        }
      })
      for (const event of decodeWebSocketEvents(body)) {
        if (event.type === 'TEXT') {
          const text = event.content!.toString('utf8')
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
