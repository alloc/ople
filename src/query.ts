import { OpleCollection } from './sync/collection'
import { OpleDocument, OpleDocumentOptions } from './sync/document'
import { OpleFunctions } from './sync/stdlib'
import { OpleRef } from './sync/values'

interface OpleQueries extends OpleFunctions {
  create<T>(
    collection: OpleRef,
    params: { data: T } & OpleDocumentOptions,
  ): OpleDocument<T>

  createCollection<T>(name: string): OpleCollection<T>
}

export function execSync<T extends keyof OpleQueries>(
  callee: T,
  ...args: Parameters<OpleQueries[T]>
): ReturnType<OpleQueries[T]> {}
