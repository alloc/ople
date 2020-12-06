import { ChangeObserver } from 'wana'
import { Record } from '../Record'
import { $R, $P } from '../symbols'
import { expectOple } from '../context'

// Effects for automatic patch queueing.
const autoQueues = new WeakMap<Record, OpleEffect>()
// Effects for automatic saving.
const autoSaves = new WeakMap<Record, OpleEffect>()

export const isAutoSaved = (record: any) => autoSaves.has(record)

/** Push local changes, and pull remote changes */
export function autoSave(enabled = true) {
  const self = expectOple()
  if (!(self instanceof Record)) {
    throw TypeError('The "autoSave" mixin expects a Record type')
  }
  let queueEffect = autoQueues.get(self)
  let saveEffect = autoSaves.get(self)
  if (enabled) {
    if (saveEffect) return
    const batch = self['_batch']

    let saving = self[$R]
      ? null
      : self.save().then(
          () => {
            // TODO: bail if `autoSave(false)` was called
            self[$P]!.forEach(batch.push)
            self[$P] = saving = null
          },
          err => {
            // TODO: handle failed save
            console.error(err)
          }
        )

    if (!saving) {
      self[$P]!.forEach(batch.push)
      self[$P] = null
    }

    let observer: ChangeObserver
    autoSaves.set(
      self,
      (saveEffect = active => {
        if (active) {
          observer = self[$O].observe($O, change => {
            if (saving) {
              self[$P]!.push(change)
            } else {
              batch.push(change)
            }
          })
        } else {
          observer.dispose()
        }
      })
    )
  } else {
    if (queueEffect) return
    self[$P] = []

    let observer: ChangeObserver
    autoQueues.set(
      self,
      (queueEffect = active => {
        if (active) {
          observer = self[$O].observe($O, change => {
            self[$P]!.push(change)
          })
        } else {
          observer.dispose()
        }
      })
    )
  }
  if (queueEffect) {
    setEffect(queueEffect, enabled ? null : queueEffect)
  }
  if (saveEffect) {
    setEffect(saveEffect, enabled ? saveEffect : null)
  }
}
