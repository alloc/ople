import { Client, query as q } from 'faunadb'

// TODO: inject config when generating backend
export const db = new Client({
  secret: 'secret',
})

export { q }
