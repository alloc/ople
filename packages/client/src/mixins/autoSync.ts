import { expectRecord } from '../context'
import { collectionByRef } from '../Ref'
import { Listener } from '../Signal'
import { makeDisposableMap } from '../utils/DisposableMap'

const autoSyncs = makeDisposableMap()

/** Pull remote changes when they occur. Local changes are ignored. */
export function autoSync(enabled = true) {
  const self = expectRecord()

  if (enabled) {
    autoSyncs.set(self, () => {
      let disposed = false
      let saveListener: Listener
      let { ref } = self

      if (ref) {
        const { client } = collectionByRef.get(ref)!
        client.call('@watch', [self])
      } else {
        saveListener = self.onSave(savePromise => {
          savePromise.then(() => {
            ref = self.ref!
            if (saveListener) {
              const { client } = collectionByRef.get(ref)!
              client.call('@watch', [self])
            }
          })
          return true
        })
      }

      return () => {
        disposed = true
        if (ref) {
          const { client } = collectionByRef.get(ref)!
          client.call('@unwatch', [self])
        }
        saveListener?.dispose()
        saveListener = void 0
      }
    })
  } else {
    autoSyncs.unset(self)
  }
}
