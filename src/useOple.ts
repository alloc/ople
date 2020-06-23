import { useMemo } from 'react'
import { useLayoutEffect } from 'react-layout-effect'
import { OpleInitFn } from './types'
import { createOple } from './createOple'
import { restoreEffects } from './Ople'

/** Create an `Ople` object as component state */
export function useOple<State extends object, Events extends object>(
  init: OpleInitFn<State, Events>,
  deps?: readonly any[]
) {
  const ople = useMemo(() => {
    const ople = createOple(init)
    ople.dispose()
    return ople
  }, [deps])

  // Restore any effects once mounted.
  useLayoutEffect(() => {
    restoreEffects(ople)
    return () => ople.dispose()
  }, [])

  return ople
}
