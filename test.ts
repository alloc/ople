import { db, write } from './'

type User = { name: string }

const user = write(abort => {
  db.createCollection('users')
  const users = db.getCollection<User>('users')
  return users.create({ name: 'alec' })
})

console.log(user)
