process.chdir(process.env.HOME + '/.nimble/pkgs/nimdbx-0.4.1/libmdbx-dist')
import { db, write } from './'

type User = { name: string }

const user = write(abort => {
  console.log(db.createCollection('users'))
  const users = db.getCollection<User>('users')
  return users.create({ name: 'alec' })
})

console.log(user)
