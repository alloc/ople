import '@ople/init'

setEnv({
  gripSecret: 'secret',
})

export interface User {
  /** The user's display name */
  name: string
  /** The user's password */
  _password: string
}

openCollection<User>('users')

// Server-sent messages
export interface Signals {}
