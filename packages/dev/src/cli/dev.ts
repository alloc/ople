import { init } from '../dev/init'
import { app } from './app'

app.command('dev').action(async () => {
  await init()
})
