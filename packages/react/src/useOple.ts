import { useEffect, useMemo } from 'react'
import { Ople } from '@ople/client'

// https://github.com/microsoft/TypeScript/issues/14829#issuecomment-504042546
type NoInfer<T> = [T][T extends any ? 0 : never]

export function useOple<Result>(init: () => Result): Result

export function useOple<Args extends any[], Result>(
  init: (...args: NoInfer<Args>) => Result,
  deps: Args
): Result

export function useOple<Args extends any[], Result>(
  init: (...args: Args) => Result,
  deps: Args = [] as any
) {
  const ople = useMemo(
    () =>
      new Ople<Result>(
        deps.length ? (init as Function).bind(null, ...deps) : init,
        false // Don't activate until mounted.
      ),
    deps
  )

  useEffect(() => {
    ople.activate()
    return () => {
      ople.deactivate()
    }
  }, [ople])

  return ople.exports
}
