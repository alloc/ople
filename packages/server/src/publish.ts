import fetch from 'node-fetch'
import readBody from 'raw-body'
import HttpAgent from 'agentkeepalive'
import { FaunaJSON } from 'faunadb'
import { log } from './log'

const url = 'http://localhost:5561/publish/'
const agent = new HttpAgent()
const headers = {
  'User-Agent': '',
  'Content-Type': 'application/json',
}

/** Publish content to the given channel. */
export async function publish(channel: string, content: any) {
  log('publish: %O %O', channel, content)
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
