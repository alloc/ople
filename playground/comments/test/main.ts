import './polyfills'
import { app } from '../client'
import { toDoc, toRef } from '@ople/client'

const username = 'sky'
const password = 'secret'

async function main() {
  app.posts.forEach(post => [toRef(post).toString(), toDoc(post).lastModified])

  // const user = await app.login(username, password).catch(err => {
  //   if (/does not exist/.test(err.message)) {
  //     return app.signUp(username, password)
  //   }
  //   throw err
  // })

  // const post = user.publish('howdy')
  // console.log('Publishing:', post)
  // await toDoc(post).save()
  // console.log('Published!')
}

main()
