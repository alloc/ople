import { Ople, Change, $O, Observable } from 'ople'
import { FaunaTime, Ref } from 'fauna-lite'
import { RecordType } from './types'
import { $R, $P } from './symbols'
import { Batch } from './batch'

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
  constructor: RecordType
}

/**
 * An observable copy of a server-managed JSON document with server-sent events.
 */
export class Record<Events extends object = any> extends Ople<
  RecordEvents & Events
> {
  // All records are observable.
  protected [$O]: Observable
  // Unsaved records have no ref.
  protected [$R]: Ref | null = null
  // Unsaved changes are kept here.
  protected [$P]: Change[] | null = null

  /**
   * When `true`, there are unsaved changes to this record.
   */
  isModified = false

  /**
   * The nanosecond-precision timestamp of the last patch received
   * from the server.
   */
  lastSyncTime: FaunaTime | null

  constructor(ts?: FaunaTime) {
    super()
    this.lastSyncTime = ts || null
    // TODO: populate the patch queue
  }

  /**
   * Send any updated values to the server as patches.
   *
   * By using the `autoSave` mixin, you can avoid calling this.
   */
  async save() {
    if (!this.isModified) return
    this.isModified = false

    const ref = this[$R]
    const patches = this[$P]
    if (ref) {
      // TODO: flush the patch queue
    } else {
      if (patches) {
        patches.length = 0
      }
      // TODO: omit getters
      this[$R] = await this._batch.invoke('ople.create', [
        this.constructor[$R],
        // Ensure client-only properties are omitted.
        { ...this, isModified: void 0, lastSyncTime: void 0 },
      ])
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

  private _batch!: Batch
}
