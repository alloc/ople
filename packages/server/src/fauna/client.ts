import {
  query as q,
  Client as FaunaClient,
  ClientConfig,
  CreateIndexParams,
} from 'faunadb'
import { is } from '@alloc/is'
import { isDev } from '@alloc/is-dev'
import { AnyProps, Ref } from './query'
import { log } from '../log'

export let db: Client

if (isDev) {
  db = new Proxy({} as Client, {
    get() {
      throw Error(
        'You forgot to call the exported `connect` function' +
          ' during the startup phase of your server.'
      )
    },
  })
}

/** Initialize the database client. */
export function connect(config: ClientConfig) {
  return (db = new Client(config))
}

/** The database client which handles query execution and database scaffolding. */
class Client extends FaunaClient {
  private collections = new Set<string>()

  /**
   * `T` is the document-level data,
   * `U` is the collection-level data
   */
  collection<T extends object = AnyProps, U extends object = AnyProps>(
    name: string,
    { data, index: indexes, roles, ...config }: CollectionConfig
  ) {
    if (this.collections.has(name)) {
      throw Error(`Collection named "${name}" already exists`)
    }
    this.collections.add(name)

    // TODO: remove unknown collections whose `data._declared` is true
    // TODO: when a `data` field is added or removed, update the collection data
    const ref = q.Collection(name)
    this.query(
      q.If(
        q.Exists(ref),
        q.Do(q.Update(ref, config), 200),
        q.Do(q.CreateCollection({ name, ...config }), 201)
      )
    )
      .then(status => {
        log(status)
        if (status == 201) {
          log(`created ${log.lgreen(name)} collection`)
        }
      })
      .catch(log.error)

    // TODO: remove unknown indexes whose `data._declared` is true
    if (indexes) {
      const coll = name
      this.query(
        q.Do(
          Object.entries(indexes).map(([name, config]) => {
            name = coll + '@' + name
            log(`declared ${log.lgreen(name)} index`)

            const terms = config.terms as any[] | undefined
            terms?.forEach((term, i) => {
              if (is.string(term)) {
                term = [term]
              }
              if (is.array(term)) {
                terms[i] = { field: term }
              }
            })

            return q.If(
              q.Exists(q.Index(name)),
              null, // TODO: allow index updates
              q.CreateIndex({
                name,
                source: q.Collection(coll),
                ...config,
              })
            )
          })
        )
      )
    }
  }
}

interface CollectionConfig<T extends object = any, U extends object = any> {
  /** Initial collection-level data */
  data?: U
  /** Initial indexes */
  index?: { [name: string]: IndexConfig<T> }
  /** Role-based access control */
  roles?: { [role: string]: RoleConfig<T> }

  ttl_days?: number
  history_days?: number
  permissions?: any
}

interface IndexConfig<T extends object = AnyProps>
  extends Omit<CreateIndexParams, 'name' | 'source' | 'terms'> {
  terms?: (string & keyof T)[]
}

interface RoleConfig<T extends object = AnyProps> {
  read?: (ref: Ref<T>) => any
  write?: (oldData: T, newData: T, ref: Ref<T>) => any
}
