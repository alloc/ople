import { User } from '../db'

exposeFunctions({
  signUp(name: string, password: string) {
    const user = write(() => {
      const users = db.getCollection('users')
      const match = users.find(user => user.name == name)
      if (match) {
        throw `User named "${name}" already exists`
      }
      return users.create({
        name,
        password,
      })
    })
    caller.uid = user.ref.id
    return user
  },
  login(name: string, password: string) {
    const user = read(() => {
      const users = db.getCollection('users')
      const user = users.find(user => user.name == name)
      if (!user) {
        throw `User named "${name}" does not exist`
      }
      if (user.password !== password) {
        throw `Incorrect password`
      }
      return user
    })
    caller.uid = user.ref.id
    caller.meta.admin = user.admin
    return user
  },
  logout() {
    caller.uid = ''
  },
  promote(ref: OpleRef<User>, secret: string) {
    if (secret && secret == process.env.ADMIN_SECRET) {
      caller.meta.admin = true
      write(() => {
        ref.update({ admin: true })
      })
    }
  },
  ban(ref: OpleRef<User>, banned = true) {
    if (!caller.meta.admin) {
      throw `Unauthorized`
    }
    write(() => {
      ref.update({ banned })
    })
  },
})
