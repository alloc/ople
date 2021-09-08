import { Post, Reply, User } from '../db'

exposePagers({
  loadPosts() {
    return db.getCollection('posts').documents
  },
  loadReplies(parentRef: OpleRef<Post> | OpleRef<Reply>) {
    return db
      .getCollection('replies')
      .filter(doc => (doc.parent || doc.post).equals(parentRef))
  },
})

exposeCreators({
  publish(props: { text: string }) {
    return publish(caller.user, props.text)
  },
  reply(props: {
    text: string
    post?: OpleRef<Post>
    parent?: OpleRef<Reply>
  }) {
    const to = props.parent || props.post
    if (!to) {
      throw `Cannot reply to nothing`
    }
    return publish(caller.user, props.text, to)
  },
})

function publish(
  author: OpleRef<User> | null,
  text: string,
  parentRef?: OpleRef<Reply> | OpleRef<Post>
) {
  if (!author) {
    throw `Not logged in`
  }
  return write(() => {
    const user = db.get(author)
    if (user.banned) {
      throw `User is banned`
    }
    if (parentRef) {
      let post: OpleRef<Post>
      let parent: OpleRef<Reply> | undefined

      const postOrReply = db.get(parentRef)
      if ('post' in postOrReply) {
        parent = postOrReply.ref
        post = postOrReply.post
      } else {
        post = postOrReply.ref
      }

      const replies = db.getCollection('replies')
      return replies.create({
        text,
        author,
        parent,
        post,
      })
    }
    const posts = db.getCollection('posts')
    return posts.create({
      text,
      author,
    })
  })
}
