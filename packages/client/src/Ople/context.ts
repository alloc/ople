import invariant from 'tiny-invariant'
import type { OpleEffect } from '../types'
import type { Ople } from '../Ople'

let current: Ople | null = null

/** Unsafely access the `Ople` context (if one exists) */
export const getOple = () => current!

/** Use `state` as the Ople context until `effect` returns */
export function withOple<In extends any[], Out>(
  state: Ople | null,
  effect: (...args: In) => Out,
  args?: In
): Out {
  const parent = current
  current = state
  try {
    return effect.apply(null, args!)
  } finally {
    current = parent
  }
}

/**
 * Tell the active `Ople` context to update the `effect` associated
 * with the given `owner` object. The `owner` is retained until its
 * `effect` is set to null. The `effect` will be called immediately
 * if the `Ople` context is not disposed.
 */
export function setEffect(owner: object, effect: OpleEffect | null) {
  invariant(current, 'Must be in an Ople context')
  const prevEffect = current.effects.get(owner)
  if (prevEffect && effect) {
    throw Error('Cannot overwrite an existing effect')
  }
  const active = !!effect
  if (effect) {
    current.effects.set(owner, effect)
  } else if (prevEffect) {
    current.effects.delete(owner)
    effect = prevEffect
  }
  if (current.active && effect) {
    effect(active)
  }
}

type OnceEffect = OpleEffect & { opleCount?: number }

const onceEffects = new WeakMap<object, OnceEffect>()

/**
 * Set an effect that is kept alive by multiple `Ople` contexts.
 * The effect is activated while at least 1 associated context is also
 * activated. Similarly, the effect is deactivated when all associated
 * contexts are deactivated.
 *
 * You must use the same `owner` to coordinate between contexts.
 */
export function setOnceEffect(owner: object, effect: OpleEffect | null) {
  invariant(current, 'Must be in an Ople context')
  let onceEffect = onceEffects.get(owner)
  if (effect) {
    if (!onceEffect) {
      let activeCount = 0
      onceEffect = active =>
        (active ? ++activeCount == 1 : --activeCount == 0) && effect(active)
      onceEffect.opleCount = 0
      onceEffects.set(owner, onceEffect)
    }
    onceEffect.opleCount!++
    setEffect(owner, onceEffect)
  } else if (onceEffect) {
    setEffect(owner, null)
    if (--onceEffect.opleCount! == 0) {
      onceEffects.delete(owner)
    }
  }
}
