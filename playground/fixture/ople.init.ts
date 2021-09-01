import '@ople/init'

setEnv({
  gripSecret: 'secret',
})

interface Bar {}

interface Foo {
  bar: Bar
}

export interface User {
  name: string
}

openCollection<User>('users')

export interface Signals {
  /** A user logged in. */
  onLogin(user: OpleRef<User>): void
  onFoo(foo: Foo): void
}
