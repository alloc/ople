import { is } from '@alloc/is'
import { OpleCursor, OplePagination, OpleSet, read } from 'ople-db'
import { Callee, Caller } from './callees'

const pagerOptionKeys = ['size', 'ts', 'before', 'after']
const isPagerOpts = (obj: any): obj is OplePagination => {
  if (!is.plainObject(obj)) {
    return false
  }
  const keys = Object.keys(obj)
  return keys.length > 0 && keys.every(key => pagerOptionKeys.includes(key))
}

export function wrapPager(getSource: Callee) {
  return (caller: Caller, ...args: any[]): OplePage => {
    const lastArg = args[args.length - 1]
    const pagerOpts = isPagerOpts(lastArg) ? lastArg : undefined
    return read(() => {
      const source: OpleSet = getSource(caller, ...args)
      return source.paginate(pagerOpts)
    })
  }
}

interface OplePage<T = any> {
  readonly data: T[]
  readonly after?: OpleCursor
  readonly before?: OpleCursor
}
