import { useMemo } from 'react'
import { ListenerMap } from 'ee-ts'
import { useLayoutEffect } from 'react-layout-effect'
import { OpleObject } from './types'

/** Subscribe to events from an `Ople` object */
export function useOple<Events extends object>(
  ople: OpleObject<any, Events>,
  effects: ListenerMap<Events>,
  deps?: readonly any[]
): void

export function useOple(
  ople: OpleObject,
  effects: ListenerMap,
  deps?: readonly any[]
) {
  const opleDeps = [ople].concat(deps || [])

  // When the `ople` or `deps` arguments are changed, treat all effects as
  // newly added. Otherwise, accumulate effects from each render.
  const usedEffects = useMemo((): ListenerMap => ({}), opleDeps)

  // To ensure call order remains stable, these listeners are created to
  // dynamically access the latest effect from the `usedEffects` cache.
  const listeners = useMemo((): ListenerMap => ({}), opleDeps)

  // Added keys are true, deleted keys are false
  const changedKeys: { [key: string]: boolean } = {}

  // Changed effects are only used if deps have changed.
  const changedEffects: ListenerMap = {}

  // Collect the changes.
  for (const key in effects) {
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

  // Merge added/deleted keys.
  useLayoutEffect(() => {
    for (const key in changedKeys) {
      if (changedKeys[key]) {
        usedEffects[key] = effects[key]
        ople.on(key, (listeners[key] = (...args) => usedEffects[key]!(...args)))
      } else {
        ople.off(key, listeners[key])
        usedEffects[key] = undefined
      }
    }
  }, opleDeps)

  // Merge changed effects.
  useLayoutEffect(() => {
    Object.assign(usedEffects, changedEffects)
  }, deps)
}
