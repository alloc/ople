import { is } from '@alloc/is'
import { OpleRef } from 'ople-db'
import { callees, Callee, Caller } from './callees'
import { createPager } from './pager'

export { db, read, write } from 'ople-db'

export function exposePager(fn: Callee) {
  return exposeFunction(createPager(fn.name, fn), fn.name)
}

export function exposePagers(fns: Record<string, Callee>) {
  for (const name in fns) {
    fns[name] = createPager(name, fns[name])
  }
  return exposeFunctions(fns)
}

export function exposeFunction(fn: Callee, name = fn.name) {
  if (!name) {
    // Return a stub to prevent crashing.
    return { authorize() {} }
  }
  callees[name] = fn
  return {
    authorize(authorize: (caller: Caller) => boolean) {
      fn.authorize = authorize
    },
  }
}

export function exposeFunctions(fns: Record<string, Callee>) {
  for (const [name, callee] of Object.entries(fns)) {
    callees[name] = callee
  }
  return {
    authorize(authorize: (caller: Caller) => boolean) {
      for (const callee of Object.values(fns)) {
        callee.authorize = authorize
      }
    },
  }
}

export function emit(caller: Caller, target: any) {
  if (!target) {
    throw Error('Invalid target')
  }

  const channel = is.string(target)
    ? target
    : target == global
    ? '*'
    : target == caller
    ? 'c:' + caller.id
    : target.constructor == OpleRef
    ? target.collection?.id == 'users'
      ? 'u:' + caller.uid
      : 'r:' + target.toString()
    : ''

  if (!channel) {
    throw Error('Invalid target')
  }

  // TODO: consider pooling these proxies
  return new Proxy(emit, {
    get(_, name: string) {
      return (...args: any[]) => {
        caller.context.publish(channel, name, args.length ? args : undefined)
      }
    },
  })
}

export function subscribe(caller: Caller, channel: string) {
  caller.context.subscribe(caller.id, channel)
}

export function unsubscribe(caller: Caller, channel: string) {
  caller.context.unsubscribe(caller.id, channel)
}
