import { setDisposer, setEffect } from './OpleContext'
import { Ople } from './Ople'
import { getOple } from '.'

/**
 * Attach an Ople context to the current context, so the given context
 * is activated, deactivated, and disposed when the current context is.
 *
 * If the given context is disposed directly, it will be detached from
 * the current context.
 */
export function attach<T extends Ople>(ople: T) {
  if (ople.parent) {
    throw Error('Cannot attach to multiple Ople contexts')
  }
  ople.parent = getOple()
  setEffect(ople, active => (active ? ople.activate() : ople.deactivate()))
  setDisposer(ople, ople)
  return ople
}
