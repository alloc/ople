import { is, PlainObject } from '@alloc/is'
import invariant from 'tiny-invariant'
import { ChangeObserver, no, o, shallowChanges } from 'wana'
import { OpleCollection, OpleRef, OpleTime } from './values'
import { setHidden } from './common'
import { getOple, setEffect, setOnceEffect } from './Ople/context'
import { OpleBackend } from './OpleBackend'
import { OpleEffect } from './types'

type Data = Record<string, any>

/** Points to an object in the database. */
type Ref<T extends Data = any> = string & OpleRef<T>

/** Manages an object in the database. */
type RefHandle<T extends Data = any> = string &
  Omit<OpleRefHandle<T>, 'takeChanges' | 'onCreate'>

export { Ref as OpleRef, RefHandle as OpleRefHandle }

const $ref = Symbol.for('ople.ref')

/**
 * Get or create an `OpleRefHandle` for the given object.
 */
export function ref<T>(data: T & { [$ref]?: OpleRefHandle<T> }) {
  invariant(getOple(), 'Must be in an Ople context')
  const handle = data[$ref] || new OpleRefHandle(data)
  trackChanges(handle)
  return handle as any
}

let defaultBackend: OpleBackend | undefined

export const setDefaultBackend = (backend: OpleBackend) =>
  (defaultBackend = backend)

/** Objects waiting on their `OpleRef` to be assigned */
const firstSaves = new WeakSet<OpleRefHandle>()

/** Objects being synced in real-time */
const autoSyncs = new WeakMap<OpleRefHandle, OpleEffect>()

/** True during an `applyPatch` call */
let isPatching = false

class OpleRefHandle<T extends Data = any> {
  protected _changed: Set<string>
  protected _collection: OpleCollection | null

  constructor(data: T, protected _ref: OpleRef | null = null) {
    this.data = o(data) as T
    setHidden(data, $ref, this)

    // All keys are dirty on new objects.
    this._changed = o(new Set(this._ref ? undefined : Object.keys(data)))
    this._collection = this._ref?.collection || null
  }

  /** The observable, readonly data. */
  readonly data: Readonly<T>
  /** When the document was last saved to the database. */
  readonly lastModified: OpleTime | null = null

  /** If the document has unsaved changes. */
  get isModified() {
    return this._changed.size > 0
  }

  get id() {
    return this._ref?.id || null
  }

  get collection() {
    return this._collection
  }

  toString() {
    invariant(this._ref, 'Cannot stringify an unsaved ref')
    return this._ref.toString()
  }

  set<P extends keyof T>(key: P, value: T[P]): void
  set(values: Partial<T>): void
  set(arg1: keyof any | PlainObject, arg2?: any) {
    if (!is.plainObject(arg1)) {
      arg1 = { [arg1]: arg2 }
    }
    Object.assign(this.data, arg1)
    Object.keys(arg1).forEach(key => this._changed.add(key))
  }

  save(collection?: string | OpleCollection) {
    if (this._changed.size) {
      if (firstSaves.has(this)) {
        return
      }
      if (collection) {
        invariant(!this._ref, 'Collection already set')
        firstSaves.add(this)
        if (is.string(collection)) {
          invariant(defaultBackend, 'Default backend not found')
          collection = defaultBackend.collection(collection)
        }
        collection.backend.call('@create', [this])
      } else {
        invariant(this._ref, 'Cannot save without a collection')
        this._ref.backend.call('@push', [this])
      }
    }
    return this.data
  }

  /**
   * Manually check for remote changes. If any exist, pull them
   * and merge them into our local data, overwriting our own changes.
   */
  sync() {
    invariant(this._ref, 'Cannot sync an unsaved ref')
    return this._ref.backend.call('@pull', [this])
  }

  autoSync(enabled: boolean) {
    if (enabled) {
      invariant(this._ref, 'Cannot sync an unsaved ref')
      if (!autoSyncs.has(this)) {
        const { backend } = this._ref
        // This effect only manages the backend subscription.
        // Pushing changes upstream is managed by the `trackChanges`
        // function, but only if `autoSyncs` contains our handle.
        const autoSync: OpleEffect = active => {
          if (active) {
            backend.call('@watch', [this])
          } else {
            backend.call('@unwatch', [this])
          }
        }
        setEffect(autoSync, autoSync)
        autoSyncs.set(this, autoSync)
      }
    } else {
      const autoSync = autoSyncs.get(this)
      if (autoSync) {
        setEffect(autoSync, null)
        autoSyncs.delete(this)
      }
    }
  }

  delete() {
    invariant(this._ref, 'Object was never saved')
    this._ref.backend.call('@delete', [this])
  }
}

/** Track which keys have changed while the current `Ople` context is active. */
function trackChanges(handle: OpleRefHandle) {
  let observer: ChangeObserver | undefined
  setOnceEffect(handle, active => {
    if (active) {
      observer = shallowChanges(handle.data, change => {
        if (isPatching) return
        markChanged(handle, change.key)

        // Push changes to backend, if auto-sync is on.
        if (autoSyncs.has(handle)) {
          const { backend } = toRef(handle.data)!
          backend.call('@push', [handle])
        }
      })
    } else if (observer) {
      observer.dispose()
      observer = undefined
    }
  })
}

const isRefHandle = (value: any): boolean => value instanceof OpleRefHandle

/** Get the `OpleRef` (if one exists) for the given object. */
export const toRef = <T extends Data>(
  data: T & { [$ref]?: OpleRefHandle<T> }
): OpleRef<T> | null => (data[$ref] ? (data[$ref] as any)._ref : null)

/** Get the `OpleCollection` associated with an `OpleRefHandle` */
export const getCollection = (handle: RefHandle): OpleCollection =>
  (handle as any)._collection

/** Initialize the ref of an `OpleRefHandle` */
export function initRef(handle: any, ref: OpleRef, ts: OpleTime) {
  invariant(isRefHandle(handle))
  handle._ref = ref
  handle.lastModified = ts
}

/** Initialize the `OpleRefHandle` of a remote object */
export function initHandle(data: any, ref: OpleRef, ts: OpleTime) {
  const handle: any = new OpleRefHandle(data, ref)
  handle.lastModified = ts
  return handle.data
}

/** Apply a remote patch without triggering a `@push` call */
export function applyPatch(handle: any, patch: any, ts: OpleTime) {
  invariant(isRefHandle(handle))
  handle.lastModified = ts
  isPatching = true
  Object.assign(handle.data, patch)
  isPatching = false
}

/** Mark a changed property for next `@push` batch. */
export function markChanged(handle: any, key: string) {
  invariant(isRefHandle(handle))
  handle._changed.add(key)
}

/** Take any buffered changes and reset the `isModified` flag. */
export function takeChanges(handle: any) {
  invariant(isRefHandle(handle))
  const data = no(handle.data)
  const changes: Record<string, any> = {}
  for (const key of handle._changed) {
    changes[key] = data[key]
  }
  handle._changed.clear()
  return changes
}
