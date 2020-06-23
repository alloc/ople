import { useMemo } from 'react'
import { ListenerMap, EventEmitter, Listener } from 'ee-ts'
import { useLayoutEffect } from 'react-layout-effect'
import { Falsy } from 'types'

/** Subscribe to events from an `Ople` object */
export function useEvents<Events extends object>(
  source: EventEmitter<Events> | Falsy,
  effects: ListenerMap<Events>,
  deps?: readonly any[]
): void

export function useEvents(
  source: EventEmitter<any> | Falsy,
  effects: ListenerMap,
  deps?: readonly any[]
) {
  const sourceDeps = [source].concat(deps || [])

  type Effects = { [key: string]: Listener | undefined }

  // When the `ople` or `deps` arguments are changed, treat all effects as
  // newly added. Otherwise, accumulate effects from each render.
  const usedEffects = useMemo((): Effects => ({}), sourceDeps)

  // To ensure call order remains stable, these listeners are created to
  // dynamically access the latest effect from the `usedEffects` cache.
  const listeners = useMemo((): Effects => ({}), sourceDeps)

  // Added keys are true, deleted keys are false
  const changedKeys: { [key: string]: boolean } = {}

  // Changed effects are only used if deps have changed.
  const changedEffects: ListenerMap = {}

  // Collect the changes.
  if (source) {
    const keys = new Set<string>()
    for (const key in effects) {
      keys.add(key)
      const effect = effects[key]
      const usedEffect = usedEffects[key]
      if (effect && usedEffect) {
        if (effect != usedEffect) {
          changedEffects[key] = effect
        }
      } else if (effect || usedEffect) {
        changedKeys[key] = !usedEffect
      }
    }
    for (const key in usedEffects) {
      if (!keys.has(key)) {
        changedKeys[key] = false
      }
    }
  }

  // Merge added/deleted keys.
  useLayoutEffect(() => {
    if (!source) return
    for (const key in changedKeys) {
      if (changedKeys[key]) {
        usedEffects[key] = effects[key] as any
        source.on(
          key,
          (listeners[key] = (...args) => usedEffects[key]!(...args))
        )
      } else {
        source.off(key, listeners[key]!)
        usedEffects[key] = undefined
      }
    }
  }, sourceDeps)

  // Merge changed effects.
  useLayoutEffect(() => {
    if (!source) return
    Object.assign(usedEffects, changedEffects)
  }, deps)
}
