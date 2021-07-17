process.chdir(process.env.HOME + '/.nimble/pkgs/nimdbx-0.4.1/libmdbx-dist')
import './test/errors'
import { db, read, write } from './src/ople'

type User = { name: string }

const users = read(() => db.getCollection<User>('users').refs.paginate())
console.log(users)

// const user = write(abort => {
//   const users = db.getCollection<User>('users')
//   if (!users.exists) {
//     console.log(db.createCollection('users'))
//   }
//   return users.create({ name: 'alec' })
// })

// console.log(user)
