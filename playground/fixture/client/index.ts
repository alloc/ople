import './polyfills'
import { logout, signUp, whoAmI } from './backend'
import { Ople } from '@ople/client'

async function run() {
  let user = await signUp('alec', 'secret')
  console.log('Signed up:', user)
  console.log('Who am I:', await whoAmI())
  user = await signUp('sky', 'secret')
  console.log('Signed up:', user)
  console.log('Who am I:', await whoAmI())
  await logout()
  console.log('Logged out')
  console.log('Who am I:', await whoAmI())
}

run().catch(console.error)
