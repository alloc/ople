import { is } from '@alloc/is'
import md5Hex from 'md5-hex'
import { Collator, OpleRef } from 'ople-db'
import { callees, Callee, Caller } from './callees'
import { editJsonFile } from './fs'
import { wrapPager } from './pager'

export { db, read, write } from 'ople-db'

const wrapCreator = (create: Function) => (...args: any[]) => {
  const doc: OpleDocument = create(...args)
  // Pack the document into a tuple to avoid the creation
  // of a new document on the client side.
  return [doc.ref, doc.data, doc.ts]
}

export function exposeCreators(fns: Record<string, Callee>) {
  for (const name in fns) {
    fns[name] = wrapCreator(fns[name])
  }
  return exposeFunctions(fns)
}

export function exposePagers(fns: Record<string, Callee>) {
  for (const name in fns) {
    fns[name] = wrapPager(fns[name])
  }
  return exposeFunctions(fns)
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

const collators: { [id: string]: Function } = {}

export function newCollator(collate: Function) {
  const id = md5Hex(collate.toString()).slice(0, 16)
  collators[id] = collate
  return { id, collate }
}

const metaFile = editJsonFile('ople_data/metadata.json')
setImmediate(() => {
  const metaData = metaFile.data
  const prevCollators: string[] = metaData.collators || []
  const nextCollators = Object.keys(collators)
  const missingCollators = prevCollators.filter(id => !collators[id])
  const unknownCollators = nextCollators.filter(
    id => !prevCollators.includes(id)
  )
  metaData.collators = nextCollators
  write(() => {
    db.getIndexes
  })
})
