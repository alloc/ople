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
    return createPost(caller.user, props.text)
  },
  reply(props: { text: string }, to: OpleRef<Post> | OpleRef<Reply>) {
    const reply = createReply(caller.user, props.text, to)
    const receiver = read(() => db.get(to).author)
    if (!receiver.equals(caller.user)) {
      emit(receiver).onReply(to, reply)
    }
    return reply
  },
})

function validateAuthor(
  author: OpleRef<User> | null
): asserts author is OpleRef<User> {
  if (!author) {
    throw `Not logged in`
  }
  if (read(() => db.get(author).banned)) {
    throw `User is banned`
  }
}

function createPost(author: OpleRef<User> | null, text: string) {
  validateAuthor(author)
  return write(() => {
    const posts = db.getCollection('posts')
    return posts.create({
      text,
      author,
    })
  })
}

function createReply(
  author: OpleRef<User> | null,
  text: string,
  context: OpleRef<Post> | OpleRef<Reply>
) {
  validateAuthor(author)
  let post: OpleRef<Post>
  let parent: OpleRef<Reply> | undefined

  const postOrReply = db.get(context)
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
