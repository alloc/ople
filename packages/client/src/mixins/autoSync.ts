import { expectRecord } from '../context'
import { Listener } from '../Signal'
import { makeDisposableMap } from '../utils/DisposableMap'
import { OpleRecord, getClient } from '../Record'
import { setHidden } from '../common'

const autoSyncs = makeDisposableMap()
/** The sync interval which resets after a successful sync. */
const kSyncInterval = Symbol('ople.syncInterval')
/** The sync timer identifier. */
const kSyncTimer = Symbol('ople.syncTimer')
/** When the sync timer was reset. */
const kSyncReset = Symbol('ople.syncReset')

interface AutoSync {
  [kSyncInterval]: number
  [kSyncTimer]: number
  [kSyncReset]: number
}

/** @internal */
export function scheduleSync(
  self: OpleRecord & Partial<AutoSync>,
  delay = self[kSyncInterval] || 0
) {
  if (delay > 0) {
    const timer = setTimeout(() => self.sync(), delay)

    setHidden(self, kSyncReset, Date.now())
    setHidden(self, kSyncTimer, timer)
  } else {
    self.sync()
  }
}

/** Pull remote changes when they occur. Local changes are ignored. */
export function autoSync(enabled = true, syncInterval = 0) {
  const self = expectRecord<OpleRecord & AutoSync>()

  if (!enabled) {
    return autoSyncs.unset(self)
  }

  const prevSyncInterval = self[kSyncInterval]
  setHidden(self, kSyncInterval, syncInterval)

  if (autoSyncs.has(self)) {
    if (self.ref && syncInterval !== prevSyncInterval) {
      let elapsed = 0
      if (prevSyncInterval > 0) {
        elapsed = Date.now() - self[kSyncReset]
        clearTimeout(self[kSyncTimer])
      }
      scheduleSync(self, syncInterval * 1e3 - elapsed)
    }
    return
  }

  // TODO: use syncInterval
  autoSyncs.set(self, () => {
    let active = true
    let saveListener: Listener | undefined

    let { ref } = self
    if (ref) {
      getClient(self).call('@watch', [self])
    } else {
      saveListener = self.onSave(savePromise => {
        savePromise.then(() => {
          ref = self.ref!
          if (active) {
            getClient(self).call('@watch', [self])
          }
        })
        return false
      })
    }

    return () => {
      active = false
      saveListener?.dispose()
      if (ref) {
        getClient(self).call('@unwatch', [self])
      }
    }
  })
}
