import '@ople/init'

setEnv({
  gripSecret: 'secret',
})

export interface User {}

openCollection<User>('users')

// Server-sent messages
export interface Signals {}
