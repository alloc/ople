import { User } from '@ople/backend'

export namespace User {
  export type Password = string
}

exposeFunctions({
  signUp(name: string, password: User.Password) {
    return write(() => {
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
  },
  login() {},
})
