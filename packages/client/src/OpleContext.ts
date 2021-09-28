import { Disposable } from '@alloc/types'
import invariant from 'tiny-invariant'
import type { Ople } from './Ople'

let current: Ople | null = null

/** Unsafely access the `Ople` context (if one exists) */
export const getOple = <T = any>(): Ople<T> => current!

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
 * Run an effect when the current Ople context is disposed,
 * or remove a disposer by passing `null`. Only one disposer
 * per `owner` argument is allowed.
 */
export function setDisposer(
  owner: object,
  disposer: Disposable | (() => void) | null
) {
  invariant(current, 'Must be in an Ople context')
  if (disposer) {
    current.disposers ||= new Map()
    current.disposers.set(owner, disposer)
  } else {
    current.disposers?.delete(owner)
  }
}

/** Pass `true` to enable the effect. Pass `false` to disable. */
export type OpleEffect = (active: boolean) => void

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

/**
 * Next time the current `Ople` context becomes active, run the given effect
 * and then unset it. If already active, run the effect immediately.
 */
export function setOnceEffect(owner: object, effect: OpleEffect | null) {
  invariant(current, 'Must be in an Ople context')
  const prevEffect = current.effects.get(owner)
  if (prevEffect && effect) {
    throw Error('Cannot overwrite an existing effect')
  }
  const context = current
  if (effect) {
    if (context.active) {
      effect(true)
    } else {
      context.effects.set(owner, () => {
        context.effects.delete(owner)
        effect(true)
      })
    }
  } else if (prevEffect) {
    context.effects.delete(owner)
  }
}

type SharedEffect = OpleEffect & { opleCount?: number }

const sharedEffects = new WeakMap<object, SharedEffect>()

/**
 * Set an effect that is kept alive by multiple `Ople` contexts.
 * The effect is activated while at least 1 associated context is also
 * activated. Similarly, the effect is deactivated when all associated
 * contexts are deactivated.
 *
 * You must use the same `owner` to coordinate between contexts.
 */
export function setSharedEffect(owner: object, effect: OpleEffect | null) {
  invariant(current, 'Must be in an Ople context')
  let sharedEffect = sharedEffects.get(owner)
  if (effect) {
    if (!sharedEffect) {
      let activeCount = 0
      sharedEffect = active =>
        (active ? ++activeCount == 1 : --activeCount == 0) && effect(active)
      sharedEffect.opleCount = 0
      sharedEffects.set(owner, sharedEffect)
    }
    sharedEffect.opleCount!++
    setEffect(owner, sharedEffect)
  } else if (sharedEffect) {
    setEffect(owner, null)
    if (--sharedEffect.opleCount! == 0) {
      sharedEffects.delete(owner)
    }
  }
}

/** Run an effect whenever the Ople context is deactivated. */
export function onDeactivate(effect: () => void): Disposable {
  invariant(current, 'Must be in an Ople context')
  const { effects } = current
  effects.set(effect, active => !active && effect())
  return { dispose: () => effects.delete(effect) }
}
