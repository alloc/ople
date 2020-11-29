import { Ref } from 'fauna-lite'
import { $R } from './symbols'

export function setHidden(self: object, key: keyof any, value: any) {
  Object.defineProperty(self, key, { value, writable: true })
}

/**
 * The `getImpl` function __cannot__ have special syntax in its argument
 * list. No destructuring, rest parameters, or default values. But the
 * returned function _can_ have them.
 */
export function makeFunctionType<T extends any[], U extends Function>(
  getImpl: (...args: T) => U,
  scope = {}
) {
  const args = /\(([^\)]*)\)/.exec(getImpl.toString())![1].replace(/\s+/g, '')
  const [, self, impl] = String((getImpl as () => Function)()).match(
    /^function\s*([^\(\s]+)?\s*(.+)/
  )!
  const keys = (args ? args.split(',') : []).concat(Object.keys(scope))
  const values = Object.values(scope)
  return (name: string, ...args: T): U =>
    new Function(
      ...keys,
      `var ${self}; return ${self} = function ${name}${impl}`
    )(...args.concat(values))
}

export const getRef = (arg: Ref | { [$R]?: Ref }) =>
  (arg instanceof Ref && arg) || arg[$R] || null

export const getRefs = (args: object[]) =>
  args.map(getRef).filter(Boolean) as Ref[]
