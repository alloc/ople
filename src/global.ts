import { Disposable } from 'ee-ts'

export const ople = {
  context: null as OpleContext | null,
  dispose(effect: Disposable) {
    const context = expectOpleContext()
    context.effects.push(effect)
  },
}

export type OpleContext = {
  effects: Disposable[]
}

/** Activate the `context` while executing the `effect` */
export function withOple(context: OpleContext, effect: () => void) {
  const parent = ople.context
  ople.context = context
  try {
    effect()
  } finally {
    ople.context = parent
  }
}

/** Expect an active `OpleContext` to exist */
export function expectOpleContext() {
  if (!ople.context) {
    throw Error('Expected to be called in an Ople context')
  }
  return ople.context
}
