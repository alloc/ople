import { api, openDatabase, OpleDate, pluck } from '@ople/backend'

interface Schema {
  users: {
    birthday: OpleDate
    gender: string
  }
}

const db = openDatabase<Schema>()

api.test = function (id: string) {
  const user = pluck(db.users.get(id), '_id', 'gender')
  user._id
}
