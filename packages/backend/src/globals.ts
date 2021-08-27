import { is } from '@alloc/is'
import { OpleRef } from 'ople-db'
import { callees, Callee, Caller } from './callees'

export function exposeFunction(callee: Callee) {
  if (!callee.name) {
    throw Error('"exposeFunction" requires a named function')
  }
  callees[callee.name] = callee
  return {
    authorize(authorize: (caller: Caller) => boolean) {
      callee.authorize = authorize
    },
  }
}

export function exposeFunctions(callees: Record<string, Callee>) {
  for (const [name, callee] of Object.entries(callees)) {
    callees[name] = callee
  }
  return {
    authorize(authorize: (caller: Caller) => boolean) {
      for (const callee of Object.values(callees)) {
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
    : target === global
    ? '*'
    : target === caller
    ? 'c:' + caller.id
    : target instanceof OpleRef
    ? target.collection?.id === 'users'
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
