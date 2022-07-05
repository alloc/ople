import { useEffect } from 'react'
import { useMemoOne } from 'use-memo-one'
import { Ople } from '@ople/client'

// https://github.com/microsoft/TypeScript/issues/14829#issuecomment-504042546
type NoInfer<T> = [T][T extends any ? 0 : never]

export function useOple<Result>(init: () => Result): Result

export function useOple<Args extends any[], Result>(
  init: (...args: NoInfer<Args>) => Result,
  args: Args
): Result

export function useOple(init: Function, args: any[] = []) {
  const ople = useMemoOne(
    () =>
      new Ople(
        args.length ? init.bind(null, ...args) : init,
        false // Don't activate until mounted.
      ),
    args
  )

  useEffect(() => {
    if (!disposeQueue.delete(ople)) {
      ople.activate()
    }
    return disposeSoon.bind(null, ople)
  }, [ople])

  return ople.exports
}

// Avoid immediately calling `ople.dispose` on unmount, since it might
// be a false positive caused by Fast Refresh.
const disposeQueue = new Set<Ople>()
const disposeSoon = (ople: Ople) => {
  disposeQueue.add(ople)
  setTimeout(() => {
    if (disposeQueue.delete(ople)) {
      ople.dispose()
    }
  }, 100)
}
