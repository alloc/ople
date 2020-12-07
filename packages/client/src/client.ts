import { is } from '@alloc/is'
import { Ref } from 'fauna-lite'
import { EventSource, EventEmitter } from 'ee-ts'
import { o, createClass, OpleInitFn, initOple } from 'ople'
import { isAutoSaved, autoSave } from './mixins'
import { agent, makeInvoker } from '@ople/agent'
import { makeBatch, Batch } from './batch'
import { RecordType } from './types'
import { Record } from './data/Record'
import { $R } from './symbols'

const { events } = agent as any

type ActionType = (...args: any[]) => Promise<any>
type EventType = (...args: any[]) => void

interface ClientTypes<T extends ClientTypes = any> {
  data: { [P in keyof T['data']]: RecordType }
  actions: { [P in keyof T['actions']]: ActionType }
  events: { [P in keyof T['events']]: EventType }
}

export type Client<T extends ClientTypes<T>> = EventSource<T['events']> &
  T['actions'] &
  T['data']

export function createClient<T extends ClientTypes<T>>(collectionTypes: {
  [name: string]: CollectionType
}) {
  // Record types by their encoded ref
  const typeCache: { [ref: string]: RecordType } = {}
  // Records by their encoded ref
  const recordCache: RecordCache = {}

  const invoke = makeInvoker(
    (key, args) => {
      // TODO: replace `Record` objects with their refs
    },
    result => {
      // TODO: replace `RawRecord` objects with their records
      return result
    }
  )

  const batch = makeBatch(invoke)

  const methods: any = {
    define(initFns: { [name: string]: OpleInitFn }) {
      for (const name in initFns) {
        const { ref } = collectionTypes[name]
        if (typeCache[ref]) {
          throw Error('Cannot redefine a record type')
        }
        typeCache[ref] = makeRecordType(
          name,
          collectionTypes[name],
          initFns[name],
          recordCache,
          batch
        )
      }
    },
    async get(refs: Ref | Ref[]) {
      const results: any[] = await batch.invoke('ople.get', [
        is.array(refs) ? refs : [refs],
      ])
      return is.array(refs) ? results : results[0]
    },
    cache: {
      get: (ref: Ref) => recordCache[encodeRef(ref)] || null,
    },
  }

  return new Proxy({} as Client<T>, {
    get(_, key) {
      if (is.string(key)) {
        if (events[key]) {
          return events[key].bind(events)
        }
        if (methods[key]) {
          return methods[key]
        }
        if (key == '$$typeof') {
          return // "react-refresh" checks this property
        }
        // All other keys are assumed to be async actions.
        return batch.invoke.bind(batch, key)
      }
    },
  })
}

interface CollectionType {
  /**
   * The `ref` identifier is used when inferring the `Record` type for
   * a given `Ref` object, and when saving a new `Record` object.
   */
  ref: string
  /**
   * The `create` function is extracted from the server-side.
   *
   * It can validate any arguments passed to the constructor, and then merge
   * them into the default properties object.
   */
  create: (...args: any[]) => object
}

interface RecordCache {
  [ref: string]: Record
}

function makeRecordType(
  name: string,
  { ref, create }: CollectionType,
  init: OpleInitFn,
  cache: RecordCache,
  batch: Batch
): RecordType {
  interface Type extends RecordType {
    _emit: EventEmitter['_emit']
    prototype: {
      _emit: EventEmitter['_emit']
      _batch: Batch
    }
  }

  const type: Type = createClass(
    name,
    (...args) => (self, set, emit) => {
      set(create(...args))
      init(self, set, emit)
      if (!isAutoSaved(self)) {
        autoSave(false)
      }
    },
    Record
  ) as any

  type[$R] = decodeRef(ref)

  // Decode a serialized record and cache it.
  type.decode = ({ ts, ref, data }) => {
    const cacheId = encodeRef(ref)
    let self = cache[cacheId]
    // Avoid overwriting a cached record.
    if (!self) {
      cache[cacheId] = self = o({
        ...data,
        [$R]: ref,
        __proto__: type.prototype,
      })
      Record.call(self, ts)
      initOple(self, init)
    }
    // Merge the data if the timestamp is newer.
    else if (!self.lastSyncTime || ts.isoTime > self.lastSyncTime.isoTime) {
      self.lastSyncTime = ts
      Object.assign(self, data)
    }
    return self
  }

  // Provide methods for event forwarding.
  EventEmitter.call(type as any)
  copyMethods(type, EventEmitter.prototype)

  // Every instance forwards its events to the constructor.
  type.prototype._emit = function (key, args) {
    // Emit on the instance.
    type._emit.call(this, key, args)
    // Emit on the constructor.
    type._emit(key, [this, ...args])
  }

  // Provide batching to Record methods.
  type.prototype._batch = batch

  return type
}

function copyMethods(dest: any, src: any) {
  Object.getOwnPropertyNames(src).forEach(name =>
    Object.defineProperty(
      dest,
      name,
      Object.getOwnPropertyDescriptor(src, name)!
    )
  )
}

function encodeRef({ id, collection, database }: Ref) {
  return (
    (database ? database.id : '') +
    '/' +
    (collection ? collection.id + '/' + id : id)
  )
}

function decodeRef(ref: string) {
  let [db, coll, id] = ref.split('/')
  if (!id) {
    if (coll) [id, coll] = [coll, '']
    else if (db) [id, db] = [db, '']
  }
  return new Ref(
    id,
    coll
      ? Ref.Native[coll] || new Ref(coll, Ref.Native.collections)
      : undefined,
    db ? new Ref(db, Ref.Native.databases) : undefined
  )
}
