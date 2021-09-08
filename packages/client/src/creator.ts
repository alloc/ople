import { isDev } from '@alloc/is-dev'
import { OpleDate } from '.'
import { applyPatch, createDocument, initRef, toDoc } from './OpleDocument'
import { OpleRef } from './OpleRef'
import { OpleTime } from './values'

export function makeCreator<
  T extends object,
  Props extends CreatorProps<T>,
  Args extends any[]
>(
  create: (props: Props, ...args: Args) => Promise<T>,
  localProps: string
): (props: Props, ...args: Args) => T {
  // These keys can be accessed before the backend responds.
  const keys = localProps.split(',')
  function get(props: any, key: string) {
    const value = props[key]
    if (value !== undefined || keys.includes(key)) {
      return value
    }
    throw Error(`Cannot access "${key}" before the document exists.`)
  }

  return (props: any, ...args: Args) => {
    let devProxy: ProxyHandler<any> | undefined

    const creating = (create(props, ...args) as Promise<any>).then(
      ([ref, data, ts]: [OpleRef, any, OpleTime]) => {
        if (devProxy) {
          devProxy.get = Reflect.get
        }
        initRef(toDoc(props), ref, ts)
        applyPatch(props, data, ts)
      }
    )

    props = createDocument(props, creating)
    if (isDev) {
      devProxy = { get }
      props = new Proxy(props, devProxy)
    }

    return props
  }
}

type CreatorProps<T extends object> = {
  [P in keyof T]?: CreatorProp<T[P]>
}

type CreatorProp<T> = T extends ReadonlyArray<infer Element>
  ? Element[] extends T
    ? ReadonlyArray<CreatorProp<T>>
    : { [P in keyof T]: CreatorProp<T[P]> }
  : T extends object
  ? 1 extends StrictAssignable<T, CreatorPropNoop>
    ? T
    : { [P in keyof T]: CreatorProp<T[P]> }
  : T

// These types are never transformed by `CreatorProps`
type CreatorPropNoop = OpleRef | OpleTime | OpleDate

/**
 * Resolves to `1` if `T` is assignable to one of the types in `U`,
 * and vice versa, one of the types in `U` is assignable to `T`.
 */
type StrictAssignable<T, U> = T extends U
  ? U extends any
    ? [U] extends [T]
      ? 1
      : never
    : never
  : never
