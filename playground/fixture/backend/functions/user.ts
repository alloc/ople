import { User } from '@ople/backend'

exposeFunctions({
  signUp(name: string, password: string) {
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
