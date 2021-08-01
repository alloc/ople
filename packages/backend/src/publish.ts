import { is } from '@alloc/is'
import fetch from 'node-fetch'
import readBody from 'raw-body'
import HttpAgent from 'agentkeepalive'
import { OpleRef } from 'ople-db'
import { log } from './log'
import { makeReplyEncoder } from '../../nason/src'

const url = 'http://localhost:5561/publish/'
const agent = new HttpAgent()
const headers = {
  'User-Agent': '',
  'Content-Type': 'application/json',
}

export type PublishArgs<T> = T extends any[] ? T : [void] extends [T] ? [] : [T]
export type Publish<T> = <E extends keyof T>(
  channel: string | OpleRef,
  event: E,
  ...args: PublishArgs<T[E]>
) => Promise<void>

makeReplyEncoder<any>({
  isRecord: arg => arg.ref instanceof OpleRef,
})

export const createPublish = <T>(): Publish<T> =>
  /** Publish an event to the given channel or record. */
  async function publish(
    channel: string | OpleRef,
    event: keyof T,
    ...args: any[]
  ) {
    if (!is.string(channel)) {
      channel = channel.toString()
      event = (channel + '/' + event) as any
    }
    await publishImpl(channel, content)
  }

type PublishFn = (channel: string, content: any) => any

let publishImpl: PublishFn = async (channel, content) => {
  const err: any = Error('Failed to publish')
  const payload = {
    items: [
      {
        channel,
        formats: {
          'ws-message': Buffer.isBuffer(content)
            ? { 'content-bin': content.toString('base64') }
            : { content: FaunaJSON.stringify(content) },
        },
      },
    ],
  }
  // TODO: batching via queueMicrotask
  const { ok, status, body } = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers,
    agent,
  })
  if (!ok) {
    if (status >= 502 && status <= 504) {
      // TODO: retry later
    }
    err.channel = channel
    err.content = content
    err.status = status
    const reason = await readBody(body as any)
    if (reason.length) {
      err.message = reason.toString('utf8')
    }
    throw err
  }
}

/** Override the publish handler. Used in development. */
export function onPublish(handler: PublishFn) {
  publishImpl = handler
}
