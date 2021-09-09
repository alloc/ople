import {
  auto,
  OplePages,
  setup,
  onceCreated,
  toRef,
  OpleRefLike,
} from '@ople/client'
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
    reply: (to: Post | Reply, text: string) => Reply
  }
}

declare const console: any

export const app = setup(() => {
  const posts = new OplePages(loadPosts)

  function setupReplies(target: Post | Reply) {
    const replies = new OplePages(loadReplies, toRef(target), {
      data: [], // Prevent initial load.
    })
    replies.onLoad(reply => {
      onceCreated(reply, () => {
        reply.replies = setupReplies(target)
        backend.cache.put(reply)
      })
    })
    return replies
  }

  posts.onLoad(post => {
    onceCreated(post, () => {
      post.replies = setupReplies(post)
      backend.cache.put(post)
    })
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
        post.author = toRef(user)
        posts.unshift(post)
        return post
      }
      user.reply = (to, text) => {
        const rep = reply({ text }, toRef(to))
        rep.author = toRef(user)
        to.replies.unshift(rep)
        return rep
      }
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
