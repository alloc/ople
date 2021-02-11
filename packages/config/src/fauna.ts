import type { Ref, CreateIndexParams } from 'faunadb'

type AnyProps = { [key: string]: any }

export const collections: { [name: string]: Collection } = {}

/**
 * `T` is the document-level data,
 * `U` is the collection-level data
 */
export function addCollection<
  T extends object = AnyProps,
  U extends object = AnyProps
>(props: Collection<T, U>) {
  if (collections[props.name]) {
    throw Error(`Collection named "${props.name}" already exists`)
  }
  collections[props.name] = props
}

export interface Collection<T extends object = any, U extends object = any> {
  name: string
  /** Initial collection-level data */
  data?: U
  /** Initial indexes */
  index?: IndexOption<T>
  /** Role-based access control */
  roles?: RoleOption<T>

  ttl_days?: number
  history_days?: number
  permissions?: any
}

export interface IndexOption<T extends object = AnyProps> {
  [name: string]: IndexConfig<T>
}

export interface IndexConfig<T extends object = AnyProps>
  extends Omit<CreateIndexParams, 'name' | 'source' | 'terms'> {
  terms?: (string & keyof T)[]
}

export interface RoleOption<T extends object = AnyProps> {
  [role: string]: RoleConfig<T>
}

export interface RoleConfig<T extends object = AnyProps> {
  read?: (ref: Ref<T>) => any
  write?: (oldData: T, newData: T, ref: Ref<T>) => any
}
