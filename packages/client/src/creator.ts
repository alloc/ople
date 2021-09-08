import { isDev } from '@alloc/is-dev'
import { o } from 'wana'
import { initRef, toDoc } from './OpleDocument'
import { OpleRef } from './OpleRef'
import { OpleTime } from './values'

export function makeCreator<
  T extends object,
  Props extends Partial<T>,
  Args extends any[]
>(create: (props: Props, ...args: Args) => Promise<T>, local: string) {
  // These keys can be accessed before the backend responds.
  const keys = local.split(',')
  function get(props: any, key: string) {
    const value = props[key]
    if (value !== undefined || keys.includes(key)) {
      return value
    }
    throw Error(`Cannot access "${key}" before the document exists.`)
  }

  return (props: any, ...args: Args) => {
    const creating: Promise<any> = create(props, ...args)
    props = o(props)

    let devProxy: ProxyHandler<any> | undefined
    if (isDev) {
      devProxy = { get }
      props = new Proxy(props, devProxy)
    }

    creating.then(([ref, data, ts]: [OpleRef, any, OpleTime]) => {
      if (devProxy) {
        devProxy.get = Reflect.get
      }
      initRef(toDoc(props), ref, ts)
      Object.assign(props, data)
    })

    return props
  }
}
