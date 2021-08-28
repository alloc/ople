import { ChangeObserver } from 'wana'
import { getModified, OpleRecord } from '../Record'
import { expectRecord } from '../context'
import { OpleEffect } from '../types'
import { setEffect } from '../Ople'
import { Listener } from '../Signal'
import { observe } from '../utils/observe'

const autoSaves = new Map<OpleRecord, OpleEffect>()

export const isAutoSaved = (record: any) => autoSaves.has(record)

/**
 * Call the `save` method of the current `Record` context every time
 * a new property is modified, but only after its `ref` prop exists.
 * Auto-saving can be disabled by passing `false`.
 */
export function autoSave(enabled = true) {
  const self = expectRecord()

  let saveEffect = autoSaves.get(self)
  if (enabled) {
    if (saveEffect) return

    let saveListener: Listener | undefined
    let observer: ChangeObserver

    saveEffect = active => {
      if (active) {
        saveListener = self.onSave(savePromise => {
          savePromise.then(() => {
            saveListener && self.isModified && self.save()
          })
        })
        observer = observe(getModified(self), () => {
          self.ref && self.save()
        })
      } else {
        observer.dispose()
        saveListener!.dispose()
        saveListener = void 0
      }
    }
  }

  if (saveEffect) {
    if (enabled) {
      autoSaves.set(self, saveEffect)
    } else {
      autoSaves.delete(self)
    }
    setEffect(saveEffect, enabled ? saveEffect : null)
  }
}
