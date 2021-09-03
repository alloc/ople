import './polyfills'
import { signUp } from './backend'
import { Ople } from '@ople/client'

async function run() {
  const user = await signUp('alec', 'secret')
  console.log('Signed up:', user)
}

run().catch(console.error)
