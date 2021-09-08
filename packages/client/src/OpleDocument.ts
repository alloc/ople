import { is, PlainObject } from '@alloc/is'
import invariant from 'tiny-invariant'
import { ChangeObserver, no, o, shallowChanges } from 'wana'
import { getOple, setEffect, setOnceEffect, OpleEffect } from './OpleContext'
import { OpleRef } from './OpleRef'
import { OpleTime } from './values'

type Data = Record<string, any>

const $doc = Symbol.for('ople.document')

/** An object whose `toString` method returns a ref string. */
export type OpleRefLike<T extends Data = any> = OpleRef<T> | Document<T>

/**
 * Get the `OpleRef` for the given object, or throw.
 */
export function toRef<T extends Data>(
  data: T & { [$doc]?: OpleDocument<T> }
): OpleRef<T>

/**
 * Get the `OpleRef` for the given object, or use the fallback value.
 */
export function toRef<T extends Data, U>(
  data: T & { [$doc]?: OpleDocument<T> },
  fallback: U
): OpleRef<T> | U

/** @internal */
export function toRef(data: any, fallback?: any) {
  const doc: any = data[$doc]
  if (doc) {
    return doc._ref
  }
  invariant(arguments.length > 1, 'Ref does not exist')
  return fallback
}

/**
 * Get the `OpleDocument` for the given object, or throw.
 *
 * You only need an `OpleDocument` for database manipulation.
 * It's recommended to only use it within an `Ople` context,
 * or else change tracking won't be active.
 */
export function toDoc<T extends object>(
  data: T & { [$doc]?: OpleDocument<T> }
): Document<T>

/**
 * Get the `OpleDocument` for the given object, or use the fallback value.
 */
export function toDoc<T extends Data, U>(
  data: T & { [$doc]?: OpleDocument<T> },
  fallback: U
): Document<T> | U

/** @internal */
export function toDoc(data: any, fallback?: any) {
  invariant(getOple(), 'Must be in an Ople context')
  const doc = data[$doc]
  if (doc) {
    trackChanges(doc)
    return doc
  }
  invariant(arguments.length > 1, 'Document not found')
  return fallback
}

/** Objects being synced in real-time */
const autoSyncs = new WeakMap<OpleDocument, OpleEffect>()

/** True during an `applyPatch` call */
let isPatching = false

class OpleDocument<T extends Data = any> {
  protected _creating: Promise<void> | null = null
  protected _changed: Set<string>

  constructor(data: T, readonly ref: OpleRef | null = null) {
    this.data = o(data) as T

    // All keys are dirty on new objects.
    this._changed = o(new Set(ref ? undefined : Object.keys(data)))
  }

  /** The observable, readonly data. */
  readonly data: Readonly<T>

  /** When the document was last saved to the database. */
  readonly lastModified: OpleTime | null = null

  // For `toRef` compatibility
  protected get [$doc]() {
    return this
  }

  /** If the document has unsaved changes. */
  get isModified() {
    return this._changed.size > 0
  }

  get id() {
    return this.ref?.id || null
  }

  get collection() {
    return this.ref?.collection || null
  }

  toString() {
    invariant(this.ref, 'Cannot stringify without a ref')
    return this.ref.toString()
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

  /**
   * If `this.ref` is not defined, you can call this for a `Promise`
   * that resolves once it exists.
   *
   * Otherwise, calling this will push any unsaved changes. This is
   * safe to call without checking `isModified` first.
   */
  async save() {
    if (!this.ref) {
      await this._creating
    }
    if (this._changed.size) {
      invariant(this.ref, 'Cannot save without a collection')
      return this.ref.backend.call('@push', [this])
    }
  }

  /**
   * Manually check for remote changes. If any exist, pull them
   * and merge them into our local data, overwriting our own changes.
   */
  sync() {
    invariant(this.ref, 'Cannot sync an unsaved ref')
    return this.ref.backend.call('@pull', [this])
  }

  autoSync(enabled: boolean) {
    if (enabled) {
      invariant(this.ref, 'Cannot sync an unsaved ref')
      if (!autoSyncs.has(this)) {
        const { backend: backend } = this.ref
        // This effect only manages the backend subscription.
        // Pushing changes upstream is managed by the `trackChanges`
        // function, but only if `autoSyncs` contains our document.
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
    invariant(this.ref, 'Object was never saved')
    this.ref.backend.call('@delete', [this])
  }
}

const Document = OpleDocument

/** Manages an object in the database. */
type Document<T extends Data = any> = string &
  Omit<OpleDocument<T>, 'takeChanges' | 'onCreate'>

export { Document as OpleDocument }

/** Track which keys have changed while the current `Ople` context is active. */
function trackChanges(doc: OpleDocument) {
  let observer: ChangeObserver | undefined
  setOnceEffect(doc, active => {
    if (active) {
      observer = shallowChanges(doc.data, change => {
        if (isPatching) return
        markChanged(doc, change.key)

        // Push changes to backend, if auto-sync is on.
        if (autoSyncs.has(doc)) {
          const { backend: backend } = toRef(doc.data)!
          backend.call('@push', [doc])
        }
      })
    } else if (observer) {
      observer.dispose()
      observer = undefined
    }
  })
}

const isDocument = (value: any): boolean => value instanceof OpleDocument

/** Initialize the ref of an `OpleDocument` */
export function initRef(doc: any, ref: OpleRef, ts: OpleTime) {
  invariant(isDocument(doc))
  doc._ref = ref
  doc.lastModified = ts
}

/** Create an `OpleDocument` for a new object */
export function createDocument(data: any, creating: Promise<void>) {
  const doc: any = new OpleDocument(data)
  doc._creating = creating.then(() => {
    doc._creating = null
  })
  return doc.data
}

/** Initialize the `OpleDocument` of a remote object */
export function initDocument(data: any, ref?: OpleRef, ts?: OpleTime) {
  const doc: any = new OpleDocument(data, ref)
  if (ts) doc.lastModified = ts
  return doc.data
}

/** Apply a remote patch without triggering a `@push` call */
export function applyPatch(doc: any, patch: any, ts: OpleTime) {
  invariant(isDocument(doc))
  doc.lastModified = ts
  isPatching = true
  Object.assign(doc.data, patch)
  isPatching = false
}

/** Mark a changed property for next `@push` batch. */
export function markChanged(doc: any, key: string) {
  invariant(isDocument(doc))
  doc._changed.add(key)
}

/** Take any buffered changes and reset the `isModified` flag. */
export function takeChanges(doc: any) {
  invariant(isDocument(doc))
  const data = no(doc.data)
  const changes: Record<string, any> = {}
  for (const key of doc._changed) {
    changes[key] = data[key]
  }
  doc._changed.clear()
  return changes
}
