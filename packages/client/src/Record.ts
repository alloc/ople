import { o, $O, Change } from 'wana'
import { FaunaTime, Ref } from 'fauna-lite'
import { $R, $M } from './symbols'
import { Batch } from './batch'
import { Ople } from './Ople'
import { emit, Signal } from './Signal'
import { isEmptyObject } from './common'
import { clientByRef, PrivateClient } from './Ref'
import { Client } from './client'

export type RecordEvents = {
  /** This record was changed. */
  change(change: Change): void
  /** This record will be saved. */
  save(saving: Promise<void>): void
  /** This record has been deleted. */
  delete(): void
}

export interface Record {
  set(state: Partial<Omit<this, keyof Record>>): void
  /** This record is being saved. */
  onSave: Signal<[saving: Promise<void>]>
  /** This record is pulling changes from the backend. */
  onSync: Signal<[syncing: Promise<void>]>
  /** This record is being deleted. */
  onDelete: Signal<[deleting: Promise<void>]>
}

/**
 * An observable copy of a server-managed JSON document with server-sent events.
 */
export class Record extends Ople {
  protected [$R]: Ref | null = null
  protected [$M]: (Object & { [key: string]: unknown }) | null = null

  /**
   * When `true`, there are unsaved changes to this record.
   */
  get isModified() {
    return !!this[$M]
  }

  /**
   * The nanosecond-precision timestamp of the last patch received
   * from the server.
   */
  lastSyncTime: FaunaTime | null

  constructor(ts?: FaunaTime) {
    super()
    this.lastSyncTime = ts || null
  }

  /**
   * Send any updated values to the server as patches.
   *
   * By using the `autoSave` mixin, you can avoid calling this.
   */
  async save(client?: Client) {
    const ref = this[$R]
    if (ref) {
      if (!client) {
        client = clientByRef.get(ref)
      } else if (clientByRef.get(ref) !== client) {
        throw Error('Records can only be saved to one client')
      }
    } else if (!client) {
      throw Error('New records must be saved with a client')
    }
    if (!ref || this.isModified) {
      // Bail out if already saving.
      let saving = pendingSaves.get(this)
      if (saving) {
        saving = saving.then(() => )
      } else {
        saving = saveRecord(this, client as PrivateClient)
        emit(this.onSave, saving)
      }
      pendingSaves.set(this, saving)
      await saving
    }
  }

  /**
   * Ask the server for any patches since the last `sync` call.
   *
   * By using the `autoSync` mixin, you can avoid calling this.
   */
  sync(): Promise<void> {
    // TODO
    return null as any
  }

  /**
   * Delete the server-managed copy of this record, and remove it
   * from the local cache.
   */
  delete(): Promise<void> {
    // TODO
    return null as any
  }

  toJSON(): object {
    // TODO
    return null as any
  }

  protected _applyPatch(patch: any) {
    isPatching = true
    Object.assign(this, patch)
    isPatching = false
  }
}

const pendingSaves = new WeakMap<Record, Promise<void>>()

const modifiedRE = /^(add|replace|remove)$/
let isPatching = false

function setModified(change: Change) {
  if (modifiedRE.test(change.op)) {
    const { target, key } = change as { target: Record; key: string }

    let modified = target[$M]
    if (modified && modified.hasOwnProperty(key)) {
      // The modified key may equal its last synced value.
      if (isPatching || change.value === modified[key]) {
        delete modified[key]
        if (isEmptyObject(modified)) {
          target[$M] = null
        }
      }
    } else if (!isPatching) {
      if (!modified) {
        modified = target[$M] = {}
      }
      modified[key] = change.oldValue
    }
  }
}

async function saveRecord(self: Record, client: PrivateClient) {
  const ref = self[$R]
  if (ref) {
    client.push(self)
  } else {
    // TODO: omit getters
    self[$R] = await this._batch.invoke('ople.create', [
      this.constructor[$R],
      // Ensure client-only properties are omitted.
      { ...this, lastSyncTime: void 0 },
    ])
    this[$M] = o(new Map())
    this[$O].observe($O, setModified)
    // TODO: call `autoSave(false)` if not auto-saved
  }
}
