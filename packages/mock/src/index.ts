import type { AgentFactory } from '@ople/agent'

export function mockBackend() {
  const send = jest.fn()
  const invoke = jest.fn()
  jest.mock('@ople/agent', (): { makeAgent: AgentFactory } => ({
    makeAgent: ({ host, port }) => ({
      host,
      port,
      sendQueue: [],
      send,
      invoke,
    }),
  }))
}
