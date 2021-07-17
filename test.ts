import { db, read, write } from './src/ople'
import './test/errors'

type User = { name: string; nicknames?: string[] }

const userNames = [
  'alec',
  'schuyler',
  'rick',
  'daryl',
  'sasha',
  'glenn',
  'maggie',
]

write(abort => {
  const users = db.getCollection<User>('users')
  if (users.exists) abort()
  console.log(db.createCollection('users'))
  for (const name of userNames) {
    console.log(users.create({ name }))
  }
})

const users = read(() => {
  const page = db.getCollection<User>('users').documents.paginate({ size: 2 })
  return page
})

console.log(users)
