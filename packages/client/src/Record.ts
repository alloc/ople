import { o, Change } from 'wana'
import { OpleTime, OpleRef } from '@ople/nason'
import { makeDisposableMap } from './utils/DisposableMap'
import { observe } from './utils/observe'
import { setHidden } from './common'
import { OpleCollection } from './Collection'
import { Ople } from './Ople'
import { emit, Signal } from './Signal'
import { OpleClient } from './client'

export namespace OpleRecord {
  export interface Events {
    /** This record was changed. */
    change(change: Change): void
    /** This record will be saved. */
    save(saving: Promise<void>): void
    /** This record has been deleted. */
    delete(): void
  }
}

export interface OpleRecord {
  set(state: Partial<Omit<this, keyof OpleRecord>>): void
  /** This record is being saved. */
  onSave: Signal<[saving: Promise<void>]>
  /** This record is pulling changes from the backend. */
  onSync: Signal<[syncing: Promise<void>]>
  /** This record is being deleted. */
  onDelete: Signal<[deleting: Promise<void>]>
}

let isPatching = false
const modifiedMap = makeDisposableMap()
const pendingSaves = new WeakMap<OpleRecord, Promise<void>>()
const queuedSaves = new Set<OpleRecord>() // TODO

/**
 * An observable copy of a server-managed JSON document with server-sent events.
 */
export class OpleRecord extends Ople {
  /**
   * Records created by the current user have no ref until they
   * are saved for the first time.
   */
  readonly ref: OpleRef | null

  constructor(ref?: OpleRef, lastModified?: OpleTime) {
    super()
    this.ref = ref || null

    const modified = o(new Set())
    setHidden(this, '__modified', modified)
    setHidden(this, '__lastModified', lastModified)

    // Track which properties have been modified since
    // the most recent `save` command.
    modifiedMap.set(this, () =>
      observe(this as any, change => {
        isPatching || modified.add(change.key)
      })
    )
  }

  /**
   * When true, this record has unsaved changes.
   */
  get isModified() {
    return getModified(this).size > 0
  }

  /**
   * Send any updated values to the server as patches.
   *
   * By using the `autoSave` mixin, you can avoid calling this.
   */
  save(collection?: OpleCollection<this>) {
    const ref = this.ref
    if (ref) {
      if (!collection) {
        collection = getCollection(this)
      } else if (collection != getCollection(this)) {
        throw Error('Records can only be saved to one collection')
      }
    } else if (!collection) {
      throw Error('New records must be saved with a collection')
    }
    if (!ref || this.isModified) {
      let saving = pendingSaves.get(this)
      // TODO: if saving already, make sure the batch is not flushed. otherwise, we need to save again.
      if (!saving) {
        const { client } = collection
        setHidden(this, '__collection', collection)

        // TODO: what if deleted before finished saving?
        saving = client.call(ref ? '@push' : '@create', [this])
        emit(this.onSave, saving)
      }
      pendingSaves.set(this, saving)
      return saving
    }
    return Promise.resolve()
  }

  /**
   * Ask the server for any patches since the last `sync` call.
   *
   * By using the `autoSync` mixin, you can avoid calling this.
   */
  // sync(): Promise<void> {
  //   const { ref } = this
  //   if (!ref) {
  //     throw Error('Record must be saved first')
  //   }
  //   const { client } = collectionByRef.get(ref)!
  // }

  /**
   * Delete the server-managed copy of this record, and remove it
   * from the local cache.
   */
  delete(): Promise<void> {
    this.dispose()
    // TODO
    return null as any
  }

  /**
   * Remove this record from the local cache, and disable its
   * side effects.
   */
  dispose() {
    // TODO
  }

  toJSON(): object {
    // TODO
    return null as any
  }
}

/** Apply changes while leaving `isModified` intact */
export function applyPatch(record: OpleRecord, patch: object) {
  isPatching = true
  Object.assign(record, patch)
  isPatching = false
  return record
}

export function getClient(record: OpleRecord): OpleClient {
  return getCollection(record).client
}

/** @internal */
export function getCollection(record: OpleRecord): OpleCollection {
  return (record as any).__collection
}

/** @internal */
export function getModified(record: OpleRecord): Set<string> {
  return (record as any).__modified
}

/** @internal */
export function getLastModified(record: OpleRecord): number {
  return (record as any).__lastModified
}
