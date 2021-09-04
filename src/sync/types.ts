import { DeepFreeze, OpleResult } from '../convert'

export { OpleArray, OpleArrayLike } from './array'
export { OpleCollection } from './collection'
export { OpleCursor, OplePage } from './page'
export { OpleSet } from './set'
export * from '../values'

/** A document result with a proxy that allows direct `data` access. */
export type OpleDocument<T extends object | null = any> = unknown &
  import('./document').OpleDocument<T> &
  OpleDocument.Data<DeepFreeze<OpleResult<T>>>

export namespace OpleDocument {
  export type Data<T extends object | null> =
    import('./document').OpleDocumentData<T>
  export type Options = import('./document').OpleDocumentOptions
}
