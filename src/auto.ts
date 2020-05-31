import { Auto, AutoConfig } from 'wana'
import { ople } from './global'

/**
 * Invoke the given function immediately and whenever the
 * observed variables are changed.
 *
 * The returned `Auto` object is managed for you.
 */
export function auto(effect: () => void, config?: AutoConfig) {
  const auto = new Auto(config)
  auto.run(effect)
  if (ople.context) {
    ople.dispose(auto)
  }
  return auto
}
