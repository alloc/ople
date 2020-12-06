import { AgentConfig, config, OnSignal } from './config'
import { socket } from './socket'
import { send } from './send'

/** The backend communicator */
export const agent = {
  /** Update the agent configuration. */
  set(newConfig: AgentConfig) {
    if (socket) throw Error('Already connected')
    Object.assign(config, newConfig)
  },
  /** Send a message to the backend. */
  send,
}

/** Receive signals from the backend. */
export function onSignal(handler: OnSignal) {
  config.onSignal = handler
}
