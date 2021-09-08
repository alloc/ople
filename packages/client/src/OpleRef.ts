import type { OpleBackend } from './OpleBackend'

type Data = Record<string, any>

class OpleRef<T extends Data = any> {
  constructor(
    readonly id: string,
    readonly collection: string,
    readonly backend: OpleBackend
  ) {}

  toString() {
    return this.collection + '/' + this.id
  }

  // @ts-ignore
  protected _type: 'OpleRef' & { data: T }
}

const Ref = OpleRef as {
  new <T extends Data>(
    id: string,
    collection: string,
    backend: OpleBackend
  ): Ref<T>
}

/** Points to an object in the database. */
type Ref<T extends Data = any> = string & OpleRef<T>

export { Ref as OpleRef }
