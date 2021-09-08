import { PackedCall } from '@ople/nason'
import { uid } from 'uid'
import { OpleDocument } from './OpleDocument'
import { OpleRef } from './OpleRef'

type Patch = Record<string, any>

/** Map an `OpleDocument` to its unsaved changes */
export type PatchMap = Record<OpleDocument, Patch>

export type OpleMethod =
  | '@push'
  | '@pull'
  | '@watch'
  | '@unwatch'
  | '@delete'
  | '@get'

export type OpleMethodCall = {
  [P in OpleMethod]: [
    method: P,
    args: [P extends '@get' ? OpleRef : OpleDocument]
  ]
}[OpleMethod]

export type OpleMethodQueue<P extends OpleMethod> = Set<
  P extends '@get' ? OpleRef : OpleDocument
>

export type OpleMethodPayload<P extends OpleMethod> = P extends '@push'
  ? PatchMap
  : any

export class OpleBatch {
  readonly id = uid()
  readonly promise: Promise<void>
  readonly resolve: (value?: PromiseLike<void>) => void
  readonly queues = {
    '@watch': new Set<OpleDocument>(),
    '@unwatch': new Set<OpleDocument>(),
    '@push': new Set<OpleDocument>(),
    '@pull': new Set<OpleDocument>(),
    '@delete': new Set<OpleDocument>(),
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
    value: P extends '@get' ? OpleRef : OpleDocument
  ) {
    this.queues[method].add(value as any)
  }

  delete<P extends OpleMethod>(
    method: P,
    value: P extends '@get' ? OpleRef : OpleDocument
  ) {
    return this.queues[method].delete(value as any)
  }
}
