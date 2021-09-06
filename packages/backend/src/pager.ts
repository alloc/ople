import { is } from '@alloc/is'
import { OpleCursor, OplePagination, OpleSet, OpleTime, read } from 'ople-db'
import { Callee, Caller } from './callees'

const pagerOptionKeys = ['size', 'ts', 'before', 'after']
const isPagerOpts = (obj: any): obj is OplePagination => {
  if (!is.plainObject(obj)) {
    return false
  }
  const keys = Object.keys(obj)
  return keys.length > 0 && keys.every(key => pagerOptionKeys.includes(key))
}

/** A materalized page of query results */
interface OplePage<T> {
  data: T[]
  before?: OpleCursor
  after?: OpleCursor
}

export class OplePager<T = any> {
  constructor(
    readonly calleeId: string,
    readonly args: any[],
    readonly page: OplePage<T>,
    readonly size: number | null = null,
    readonly ts: number | OpleTime | null = null
  ) {}
}

export function createPager(calleeId: string, getSource: Callee) {
  return (caller: Caller, ...args: any[]) => {
    const lastArg = args[args.length - 1]
    const pagerOpts = isPagerOpts(lastArg) ? lastArg : undefined
    const firstPage = read(() => {
      const source: OpleSet = getSource(caller, ...args)
      return source.paginate(pagerOpts)
    })
    if (pagerOpts) {
      args.pop()
    }
    const pager = new OplePager(
      calleeId,
      args,
      firstPage,
      pagerOpts?.size,
      pagerOpts?.ts
    )
  }
}
