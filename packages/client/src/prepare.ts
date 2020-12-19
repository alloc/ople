import { Class } from '@alloc/is'
import { getOple, withOple } from './context'
import { setState } from './setState'
import { Ople, restoreEffects, setEffect } from './Ople'

const $prepareFns = Symbol('ople.prepareFns')

/** Listener passed to the `prepare` hook */
export type OnPrepare<T extends Ople = any> = (self: T) => void

/** Run the `prepare` callbacks of the given class on `self`. */
export function prepare<T extends Ople>(self: T, ctr: Class<T>): void

/** Add a `prepare` callback to the given class. */
export function prepare<T extends Ople>(
  ctr: Class<T>,
  onPrepare?: OnPrepare<T>
): void

/** @internal */
export function prepare(self: Ople | OpleClass, ctr: any) {
  if (self instanceof Ople) {
    // Only the `onPrepare` listeners of the given class are invoked,
    // because any superclass constructors may call `prepare` too.
    if (ctr[$prepareFns]) {
      const args = [self, setState]
      for (const onPrepare of ctr[$prepareFns]) {
        withOple(self, onPrepare, args)
      }
    }
    // When an Ople object is prepared within another Ople context,
    // its effects are toggled in tandem with its context.
    if (self.constructor == ctr && getOple()) {
      setEffect(self, active => {
        if (active) restoreEffects(self)
        else self.dispose()
      })
    }
  } else {
    // Multiple `onPrepare` listeners may exist for an Ople class.
    const prepareFns = self[$prepareFns] || (self[$prepareFns] = [])
    prepareFns.push(ctr)
  }
}

interface OpleClass<T extends Ople = any> extends Class<T> {
  [$prepareFns]?: OnPrepare<T>[]
}
