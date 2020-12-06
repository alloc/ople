import { Class } from 'is'
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
  onPrepare: OnPrepare<T>
): void

/** @internal */
export function prepare(self: Ople | OpleClass, ctr: any) {
  if (self instanceof Ople) {
    const args = [self, setState]
    for (const onPrepare of ctr[$prepareFns]) {
      withOple(self, onPrepare, args)
    }
    if (getOple()) {
      setEffect(self, active => {
        if (active) restoreEffects(self)
        else self.dispose()
      })
    }
  } else {
    const prepareFns = self[$prepareFns] || (self[$prepareFns] = [])
    prepareFns.push(ctr)
  }
}

interface OpleClass<T extends Ople = any> extends Class<T> {
  [$prepareFns]?: OnPrepare<T>[]
}
