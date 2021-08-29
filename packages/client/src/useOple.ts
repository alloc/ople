import { useEffect, useMemo } from 'react'
import { Ople } from './Ople'

export function useOple<Args extends any[], Result>(
  init: (...args: Args) => Result,
  deps: Args = [] as any
) {
  const ople = useMemo(() => {
    const ople = new Ople(deps.length ? () => init(...deps) : init)
    ople.deactivate()
    return ople
  }, deps)

  useEffect(() => {
    ople.activate()
    return () => {
      ople.deactivate()
    }
  }, [ople])

  return ople.exports
}
