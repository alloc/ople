import { is } from '@alloc/is'
import { Any, Disposable } from '@alloc/types'
import invariant from 'tiny-invariant'
import { getOple, setEffect, withOple } from './OpleContext'
import { toRef } from './OpleDocument'
import { Ople } from './Ople'

export function makeSignal<T>(): OpleSignal<T> {
  const listeners = new Set<OpleListener>()
  function signal(listener: any) {
    invariant(!listener.context, 'Handler already in use')
    setEffect(listener, active => {
      if (active) {
        signal.size++
        listeners.add(listener)
      } else {
        listeners.delete(listener)
        signal.size--
      }
    })
    listener.context = getOple()
    listener.dispose = disposeListener
    return listener
  }
  signal.size = 0
  signal.emit = (arg: any) =>
    listeners.forEach(listener => {
      withOple(listener.context!, listener, [arg])
    })
  return signal
}

export interface SignalFactory<Signals extends object> {
  <P extends string & keyof Signals>(signalId: P): Signals[P]
}

export function makeSignalFactory<Signals extends object>(
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
      invariant(toRef(target), 'Target ref must exist')
    }
    invariant(!listener.context, 'Handler already in use')
    setEffect(listener, active => {
      if (active) {
        listener.target = target
        addListener(target, signalId, listener)
      } else {
        removeListener(target, signalId, listener)
        listener.target = void 0
      }
    })
    listener.context = getOple()
    listener.dispose = disposeListener
    return listener
  }
}

type SignalArgs<T> = [T] extends [Any]
  ? [value?: any]
  : void extends T
  ? []
  : [value: T]

export interface OpleSignal<T = any> {
  (listener: (...args: SignalArgs<T>) => boolean | void): OpleListener
  /** Notify all active listeners */
  emit(...args: SignalArgs<T>): void
  /** The number of active listeners */
  size: number
}

/** The listener of a signal. */
export interface OpleListener extends Disposable {
  (...args: any[]): void
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
    this.context = undefined
  }
}
