import { User } from '@ople/backend'

// Test out namespace copying
export namespace User {
  export type Password = string
}

exposeFunctions({
  signUp(name: string, password: User.Password) {
    const user = write(() => {
      const users = db.getCollection('users')
      const match = users.find(user => user.data.name == name)
      if (match) {
        throw `User named "${name}" already exists`
      }
      return users.create({
        name,
        _password: password,
      })
    })
    caller.uid = user.ref.id
    return user
  },
  login(name: string, password: User.Password) {
    const user = read(() => {
      const users = db.getCollection('users')
      const match = users.find(user => user.data.name == name)
      if (!match) {
        throw `User named "${name}" does not exist`
      }
      if (match.data._password !== password) {
        throw `Incorrect password`
      }
      return match
    })
    caller.uid = user.ref.id
    return user
  },
  logout() {
    caller.uid = ''
  },
})
