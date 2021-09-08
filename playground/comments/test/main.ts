import './polyfills'
import { app } from '../client'
import { toDoc } from '@ople/client'

const username = 'sky'
const password = 'secret'

async function main() {
  const user = await app.login(username, password).catch(err => {
    if (/does not exist/.test(err.message)) {
      return app.signUp(username, password)
    }
  })

  const post = user.publish('howdy')
  console.log('Publishing:', post)
  await toDoc(post).save()
  console.log('Published!')
}

main()
