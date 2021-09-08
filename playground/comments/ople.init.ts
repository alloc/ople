import '@ople/init'

setEnv({
  gripSecret: 'secret',
})

export interface User {
  name: string
  password: string
  banned?: boolean
  admin?: boolean
}

openCollection<User>('users')

export interface Post {
  text: string
  author: OpleRef<User>
}

openCollection<Post>('posts')

export interface Reply {
  text: string
  author: OpleRef<User>
  parent?: OpleRef<Reply>
  post: OpleRef<Post>
}

openCollection<Reply>('replies')

// Server-sent messages
export interface Signals {
  test(ref: OpleRef<Post>): void
}

// Caller metadata
export interface CallerMeta {
  admin?: boolean
}
