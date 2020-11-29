import { $O, expectOple, ChangeObserver, setEffect, OpleEffect } from 'ople'
import { Record } from '../data/Record'
import { $R } from '../symbols'

const autoSyncs = new WeakMap<Record, OpleEffect>()

/** Pull remote changes when they occur. Local changes are ignored. */
export function autoSync(enabled = true) {
  const self = expectOple()
  if (!(self instanceof Record)) {
    throw TypeError('The "autoSync" mixin expects a Record type')
  }

  const ref = self[$R]
  // TODO: if no ref exists, wait until saved

  // setEffect(ref, active => {
  //   if (active) {
  //     batch.watch(self)
  //   } else {
  //     batch.unwatch(self)
  //   }
  // })
}
