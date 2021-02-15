import { ChangeObserver } from 'wana'
import { getModified, Record } from '../Record'
import { expectRecord } from '../context'
import { OpleEffect } from '../types'
import { setEffect } from '../Ople'
import { Listener } from '../Signal'
import { observe } from '../utils/observe'

// Effects for automatic saving.
const autoSaves = new WeakMap<Record, OpleEffect>()

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
    if (self.ref) {
      autoSaves.set(self, saveOnChange(self))
    } else {
      self.onSave(saving => {
        saving.then(() => autoSaves.set(self, saveOnChange(self)))
      })
    }
  }

  if (saveEffect) {
    setEffect(saveEffect, enabled ? saveEffect : null)
  }
}

function saveOnChange(self: Record) {
  let saveListener: Listener | undefined
  let observer: ChangeObserver
  return (active: boolean) => {
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
