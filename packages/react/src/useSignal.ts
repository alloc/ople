import { OpleSignal, makeSignal } from '@ople/client'
import { useEffect, useRef } from 'react'

export function useSignal<T = void>(): OpleSignal<T>

export function useSignal<T>(
  signal: OpleSignal<T>,
  handler: OpleSignal.Handler<T>
): void

export function useSignal<T = void>(
  signal?: OpleSignal,
  handler?: OpleSignal.Handler
) {
  if (signal) {
    useEffect(() => signal(handler!).dispose)
  } else {
    const signal = useRef<OpleSignal<T>>()
    return (signal.current ??= makeSignal())
  }
}
