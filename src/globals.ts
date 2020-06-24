import { globals as G } from 'wana'
import { Ople } from './Ople'

export const globals = G as typeof G & {
  onEmit: ((source: Ople, key: string, args: any[]) => void) | null
}

globals.onEmit = null
