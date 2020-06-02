import { auto as createAuto, AutoConfig } from 'wana'
import { getOple } from './global'

/**
 * Invoke the given function immediately and whenever the
 * observed variables are changed.
 *
 * The returned `Auto` object is managed for you.
 */
export function auto(effect: () => void, config?: AutoConfig) {
  const auto = createAuto(effect, config)
  getOple()?.dispose(auto)
  return auto
}
