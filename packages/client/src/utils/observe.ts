import { $O, Change, Observable } from 'wana'

/**
 * Observe the shallow changes to an observable object.
 * Throws an error if not observable.
 */
export function observe(
  target: object & { [$O]?: Observable },
  onChange: (change: Change) => void
) {
  const observable = target[$O]
  if (!observable) {
    throw Error('Not observable')
  }
  return observable.observe($O, onChange)
}
