import {  expectRecord } from '../context'
import { $R } from '../symbols'

/**
 * Run the given effect only if the `Record` context has
 * been saved on the backend.
 */
export function whenSaved(effect: () => void) {
  const self = expectRecord()
  if (self[$R]) {
    effect()
  } else {
    self.onSave(saving => saving.then(() => ))
  }
}
