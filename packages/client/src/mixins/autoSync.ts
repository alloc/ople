import { expectRecord } from '../context'
import { collectionByRef } from '../Ref'
import { Listener } from '../Signal'
import { makeDisposableMap } from '../utils/DisposableMap'

const autoSyncs = makeDisposableMap()

/** Pull remote changes when they occur. Local changes are ignored. */
export function autoSync(enabled = true, syncInterval = -1) {
  const self = expectRecord()

  if (enabled) {
    // TODO: use syncInterval
    if (autoSyncs.has(self)) return
    autoSyncs.set(self, () => {
      let active = true
      let saveListener: Listener | undefined
      let { ref } = self

      if (ref) {
        const { client } = collectionByRef.get(ref)!
        client.call('@watch', [self])
      } else {
        saveListener = self.onSave(savePromise => {
          savePromise.then(() => {
            ref = self.ref!
            if (active) {
              const { client } = collectionByRef.get(ref)!
              client.call('@watch', [self])
            }
          })
          return false
        })
      }

      return () => {
        active = false
        saveListener?.dispose()
        if (ref) {
          const { client } = collectionByRef.get(ref)!
          client.call('@unwatch', [self])
        }
      }
    })
  } else {
    autoSyncs.unset(self)
  }
}
