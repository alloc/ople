import { Auto, mountAuto, AutoConfig } from 'wana'
import { getOple, withOple, expectOple } from './global'
import { setEffect } from './Ople'

/**
 * Invoke the given function immediately and whenever the
 * observed variables are changed.
 *
 * If called within an `Ople` context, you are _not_ required
 * to call the `dispose` method to release memory.
 */
export function auto(effect: () => void, config: AutoConfig = {}) {
  const auto = new Auto(config)

  const parent = getOple()
  if (parent) {
    effect = (withOple as any).bind(null, parent, effect)
    attachAuto(auto)
  }

  auto.run(effect)
  return auto
}

/**
 * Tie the lifecycle of an `Auto` object to the active `Ople` context,
 * but not vice versa. Call `auto.dispose()` to stop the reaction early.
 */
export function attachAuto(auto: Auto) {
  const setState = mountAuto(auto)

  const { onCommit, onDispose } = auto

  auto.onCommit = observer => {
    setState({ observer })
    onCommit(observer)
  }

  const parent = expectOple()
  auto.onDispose = () => {
    if (!updating) {
      withOple(parent, setEffect, [auto, null])
    }
    onDispose()
  }

  let updating = false
  setEffect(auto, mounted => {
    updating = true
    setState({ mounted })
    updating = false
  })
}
