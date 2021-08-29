import { is } from '@alloc/is'
import { AnyFn, Disposable } from '@alloc/types'
import invariant from 'tiny-invariant'
import { getOple, setEffect, withOple } from './OpleContext'
import { Ople } from './Ople'

export interface SignalFactory<Signals extends Record<string, AnyFn>> {
  <P extends string & keyof Signals>(signalId: P): Signals[P]
}

export function makeSignalFactory<Signals extends Record<string, AnyFn>>(
  addListener: (target: any, signalId: string, listener: OpleListener) => void,
  removeListener: (
    target: any,
    signalId: string,
    listener: OpleListener
  ) => void
): SignalFactory<Signals> {
  return (signalId: string): any => (arg: any, listener?: any) => {
    let target: any
    if (is.function(arg)) {
      listener = arg
    } else {
      target = arg
    }
    setEffect(listener, active => {
      if (active) {
        invariant(!listener.target, 'Handler already in use')
        listener.target = target
        listener.context = getOple()
        addListener(target, signalId, listener)
      } else {
        removeListener(target, signalId, listener)
        listener.target = listener.context = void 0
      }
    })
    listener.dispose = disposeListener
    return listener
  }
}

/** The listener of a signal. */
export interface OpleListener extends AnyFn, Disposable {
  /**
   * The signal target.
   *
   * This property only exists when listening.
   */
  target?: any
  /**
   * The `Ople` context this listener was created in.
   *
   * This property only exists when listening.
   */
  context?: Ople
}

function disposeListener(this: OpleListener) {
  if (this.context) {
    withOple(this.context, setEffect, [this, null])
  }
}
