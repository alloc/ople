import { Class } from 'is'
import { withOple } from './context'
import { $prepareFns } from './symbols'
import { setState } from './setState'

/** Listener passed to the `prepare` hook */
export type OnPrepare<T = any> = (self: T) => void

/**
 * If you called `onPrepare` within a `setup` callback, you must call this
 * inside the class constructor after you've initialized all instance properties,
 * or else your `onPrepare` listeners will never run.
 */
export function prepare<T>(self: T, ctr: Class<T>): void
export function prepare<T>(ctr: Class<T>, onPrepare: OnPrepare<T>): void
export function prepare(self: any, ctr: any) {
  if (ctr == self.constructor) {
    const args = [self, setState]
    for (const onPrepare of ctr[$prepareFns]) {
      withOple(self, onPrepare, args)
    }
  } else {
    const prepareFns = self[$prepareFns] || (self[$prepareFns] = [])
    prepareFns.push(ctr)
  }
}
