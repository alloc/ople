import { query as q, Ref, CollectionRef } from 'faunadb'
import { db } from './fauna'
import { api } from './api'
import { log } from './log'

interface PatchMap {
  [ref: string]: { [key: string]: any }
}

// TODO: rate limiting
api.extend({
  /**
   * Fetch the data of every given ref.
   */
  async 'ople.get'(refs: Ref[]) {
    // TODO
  },

  /**
   * Create a document and return its ref.
   */
  async 'ople.create'(coll: CollectionRef, data: object) {
    // TODO: credentials, delegates, ttl
    // TODO: run "shouldSave" collection hook for validation
    const ref = await db.query(q.Select('ref', q.Create(coll, { data })))
    // TODO: run "onCreate" collection hook
    // TODO: notify relevant index subscribers
    return ref as Ref
  },

  /**
   * Publish a set of patches to a set of documents.
   */
  async 'ople.push'(payload: PatchMap) {
    const rejected: PatchMap = {}
    // TODO: split patches into two groups (valid and invalid)
    // TODO: notify relevant channels
    return rejected
  },

  /**
   * Delete the given documents.
   */
  async 'ople.delete'(refs: Ref[]) {
    const rejected: Ref[] = []
    // TODO: notify relevant index subscribers
    return rejected
  },

  /**
   * Watch a set of documents for changes.
   */
  async 'ople.watch'(refs: Ref[], ts?: number) {
    // TODO: subscribe connection to relevant channels
    // TODO: return latest values after checking "If-Modified-Since" header
    const errors: string[] = []
    // TODO: check if access is allowed!
    if (true) {
    }
    return { errors }
  },

  /**
   * Stop watching a set of documents.
   */
  async 'ople.unwatch'(refs: Ref[]) {
    // TODO
  },

  /**
   * Run an array of actions in serial order.
   */
  'ople.run'() {
    // TODO
  },
})
