import EventEmitter from 'events'
import { is } from '@alloc/is'
import { Expr } from 'faunadb'
import { collections } from '@ople/config'
import { db, q } from './client'

/**
 * Initialize the configured Fauna collections.
 */
export async function initCollections(events: EventEmitter) {
  const queries: Expr<any>[] = []

  Object.values(collections).forEach(
    ({ name, data, index: indexes, roles, ...config }) => {
      const collectionRef = q.Collection(name)

      // Upsert the collection.
      events.emit('collection:init', { name })
      queries.push(
        q.If(
          q.Exists(collectionRef),
          q.Update(collectionRef, config),
          q.CreateCollection({ name, ...config })
        )
      )

      if (indexes) {
        const collectionId = name
        for (let [indexId, indexConfig] of Object.entries(indexes)) {
          indexId = collectionId + '@' + indexId

          const terms = indexConfig.terms as any[] | undefined
          terms?.forEach((term, i) => {
            if (is.string(term)) {
              term = [term]
            }
            if (is.array(term)) {
              terms[i] = { field: term }
            }
          })

          events.emit('index:init', { name: indexId })
          queries.push(
            q.If(
              q.Exists(q.Index(indexId)),
              null, // TODO: allow index updates
              q.CreateIndex({
                ...indexConfig,
                name,
                source: collectionRef,
                terms,
              })
            )
          )
        }
      }
    }
  )

  return db.query(q.Do(...queries)).catch(err => {
    events.emit('error', err)
  })
}
