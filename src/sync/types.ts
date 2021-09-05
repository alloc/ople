import { DeepFreeze, OpleResult } from '../convert'

export { OpleCollection } from './collection'
export * from '../values'

export type { OpleArray, OpleArrayLike } from './array'
export type { OpleCursor, OplePage } from './page'
export type { OpleSet, OplePagination } from './set'

/** A document result with a proxy that allows direct `data` access. */
export type OpleDocument<T extends object | null = any> = unknown &
  import('./document').OpleDocument<T> &
  OpleDocument.Data<DeepFreeze<OpleResult<T>>>

export namespace OpleDocument {
  export type Data<T extends object | null> =
    import('./document').OpleDocumentData<T>
  export type Options = import('./document').OpleDocumentOptions
}
