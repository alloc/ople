import invariant from 'tiny-invariant'
import { Auto, AutoConfig } from 'wana'
import { mountAuto } from 'wana/core'
import { getOple, setEffect, setOnceEffect, withOple } from './OpleContext'

/**
 * Invoke the given function immediately and whenever the
 * observed variables are changed.
 *
 * If called within an `Ople` context, you are _not_ required
 * to call the `dispose` method to release memory.
 */
export function auto(effect: () => void, config: AutoConfig = {}) {
  const auto = new Auto(config)

  const ople = getOple()
  if (ople) {
    effect = (withOple as any).bind(null, ople, effect)
    setOnceEffect(auto, () => {
      attachAuto(auto)
      auto.run(effect)
    })
  } else {
    auto.run(effect)
  }

  return auto
}

/**
 * Tie the lifecycle of an `Auto` object to the active `Ople` context,
 * but not vice versa. Call `auto.dispose()` to stop the reaction early.
 */
export function attachAuto(auto: Auto) {
  const parent = getOple()
  invariant(parent, 'Must be in an Ople context')

  const setState = mountAuto(auto)
  const { onCommit, onDispose } = auto

  auto.onCommit = observer => {
    setState({ observer })
    onCommit(observer)
  }

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
