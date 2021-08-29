import { PackedCall } from '@ople/nason'
import { uid } from 'uid'
import { OpleRef, OpleRefHandle } from './OpleRef'
import { Deferred } from './utils/defer'

type Patch = Record<string, any>

/** Map an `OpleRefHandle` to its unsaved changes */
export type PatchMap = Record<OpleRefHandle, Patch>

export type OpleMethod =
  | '@push'
  | '@pull'
  | '@watch'
  | '@unwatch'
  | '@create'
  | '@delete'
  | '@get'

export type OpleMethodCall = {
  [P in OpleMethod]: [
    method: P,
    args: [P extends '@get' ? OpleRef : OpleRefHandle]
  ]
}[OpleMethod]

export type OpleMethodQueue<P extends OpleMethod> = Set<
  P extends '@get' ? OpleRef : OpleRefHandle
>

export type OpleMethodPayload<P extends OpleMethod> = P extends '@push'
  ? PatchMap
  : any

export class OpleBatch {
  readonly id = uid()
  readonly promise: Promise<void>
  readonly resolve: (value?: PromiseLike<void>) => void
  readonly queues = {
    '@watch': new Set<OpleRefHandle>(),
    '@unwatch': new Set<OpleRefHandle>(),
    '@push': new Set<OpleRefHandle>(),
    '@pull': new Set<OpleRefHandle>(),
    '@create': new Set<OpleRefHandle>(),
    '@delete': new Set<OpleRefHandle>(),
    '@get': new Set<OpleRef>(),
  }
  /** Call queue for user-defined, backend functions */
  calls: PackedCall[] = []
  /** Patches being pushed */
  patches: PatchMap | null = null

  constructor() {
    let resolve: typeof this.resolve
    this.promise = new Promise(f => (resolve = f))
    this.resolve = resolve!
  }

  call<P extends OpleMethod>(
    method: P,
    value: P extends '@get' ? OpleRef : OpleRefHandle
  ) {
    this.queues[method].add(value as any)
  }

  delete<P extends OpleMethod>(
    method: P,
    value: P extends '@get' ? OpleRef : OpleRefHandle
  ) {
    return this.queues[method].delete(value as any)
  }
}
