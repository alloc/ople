import { query as presets } from 'faunadb'
import { is } from '@alloc/is'
import { FaunaQueries } from './queries'

export function createQueries<T extends object>(): FaunaQueries<T> {
  return new Proxy(presets as any, handler)
}

const handler: ProxyHandler<any> = {
  get(_, key) {
    if (is.string(key)) {
      return key in presets
        ? (presets as any)[key]
        : presets.Call.bind(null, key)
    }
  },
}
