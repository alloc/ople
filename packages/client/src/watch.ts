import * as wana from 'wana'
import { getOple, OpleEffect } from './OpleContext'

export const watch: typeof wana.watch = (root: any, arg2: any, arg3?: any) => {
  const watcher = wana.watch(root, arg2, arg3)

  const ople = getOple()
  if (ople) {
    // Stop observing when the Ople context is deactivated.
    // Resume observing when reactivated.
    const effect: OpleEffect = active =>
      // TODO: crawl the observable tree when reactivating
      watcher.observed.forEach(
        active ? value => value.add(watcher) : value => value.delete(watcher)
      )

    ople.effects.set(watcher, effect)
    if (!ople.active) {
      effect(false)
    }

    // Allow the caller to stop watching forever.
    const { dispose } = watcher
    watcher.dispose = () => {
      ople.effects.delete(watcher)
      dispose.call(watcher)
    }
  }

  return watcher
}
