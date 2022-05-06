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
    ople.activate()
    return ople.dispose
  }, [ople])

  return ople.exports
}
