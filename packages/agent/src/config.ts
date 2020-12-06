export interface AgentConfig {
  /** Defaults to `localhost` */
  host?: string
  /** Defaults to `44301` */
  port?: number
}

export const config = {
  /** Pushpin host */
  host: 'localhost',
  /** Pushpin port */
  port: 7999,
  /** Backend signal handler */
  onSignal: null as OnSignal | null,
}

export type OnSignal = (name: string, args: any[]) => void
