import { auto, OplePages, setup, toDoc, toRef } from '@ople/client'
import backend, {
  loadPosts,
  loadReplies,
  publish,
  reply,
  login,
  signUp,
  User,
  onReply,
  Reply,
  Post,
} from './backend'

declare module './backend' {
  export interface Post {
    replies: OplePages<Reply>
  }
  export interface Reply {
    replies: OplePages<Reply>
  }
  export interface User {
    publish: (text: string) => Post
    reply: typeof reply
  }
}

declare const console: any

export const app = setup(() => {
  const posts = new OplePages(loadPosts)

  function setupReplies(target: Post | Reply) {
    const replies = new OplePages(loadReplies, toRef(target))
    replies.onLoad(reply => {
      backend.cache.put(reply)
      reply.replies = setupReplies(target)
    })
    return replies
  }

  posts.onLoad(post => {
    backend.cache.put(post)
    post.replies = setupReplies(post)
  })

  auto(() => {
    console.log('posts:', Array.from(posts))
  })

  const wrapUser = (user: User) =>
    setup(() => {
      onReply((to, reply) => {
        console.log('Received a reply:', reply)
        const parent = backend.cache.get(to)
        if (parent) {
          parent.replies
        }
      })
      user.publish = text => {
        const post = publish({ text })
        posts.pages[0].data.unshift(post)
        posts.onLoad.emit(post)
        return post
      }
      user.reply = reply
      return user
    })

  return {
    posts,
    login: (name: string, password: string) =>
      login(name, password).then(wrapUser),
    signUp: (name: string, password: string) =>
      signUp(name, password).then(wrapUser),
  }
})
