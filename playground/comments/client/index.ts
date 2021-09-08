import { auto, OplePages, ref, setup } from '@ople/client'
import backend, {
  loadPosts,
  loadReplies,
  publish,
  reply,
  login,
  signUp,
  User,
} from './backend'

declare module './backend' {
  export interface Post {
    replies: OplePages<Reply>
  }
  export interface User {
    publish: typeof publish
    reply: typeof reply
  }
}

declare const console: any

export const app = setup(() => {
  const posts = new OplePages(loadPosts)

  posts.onLoad(post => {
    post.replies = new OplePages(loadReplies, ref(post))
    console.log(post)
  })

  auto(() => {
    console.log('posts:', Array.from(posts))
  })

  return {
    posts,
    login: (name: string, password: string) =>
      login(name, password).then(wrapUser),
    signUp: (name: string, password: string) =>
      signUp(name, password).then(wrapUser),
  }
})

function wrapUser(user: User) {
  return setup(() => {
    // TODO: setup reply notifications
    user.publish = publish
    user.reply = reply
    return user
  })
}
