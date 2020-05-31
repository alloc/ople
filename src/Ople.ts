import {
  Disposable,
  EventEmitter,
  EventKey,
  ListenerMap,
  Listener,
  $addListener,
} from 'ee-ts'
import { ople } from './global'
import { $effects } from './symbols'
import { no } from 'wana'

/** @internal */
export class Ople<Events extends object = any> extends EventEmitter<Events> {
  private [$effects]: Disposable[]
  constructor(effects: Disposable[] = []) {
    super()
    this[$effects] = effects
  }

  /**
   * When `effect` is defined, it will be disposed when this object is.
   * When undefined, this object is disposed along with any effects.
   */
  dispose(effect?: Disposable) {
    if (effect) {
      this[$effects].push(effect)
    } else {
      this[$effects].forEach(effect => effect.dispose())
    }
  }

  // @override
  protected [$addListener](
    arg: EventKey<Events> | ListenerMap<Events>,
    fn?: Listener<Events>,
    disposables?: Disposable[],
    once?: boolean
  ): this | Listener<Events> {
    const { context } = ople
    // TODO: make `dispose` affect one-time listeners
    if (context && !disposables && !once) {
      disposables = context.effects
    }
    return super[$addListener](arg, fn, disposables, once)
  }
}

const proto = Ople.prototype

// Avoid observation of event listeners.
proto.emit = no(proto.emit)
