import { app, log, checkDocker, loadProject } from './app'
import { startPushpin } from '../..'

app.command('pushpin start', 'Start the Pushpin server').action(async () => {
  await checkDocker()
  const project = await loadProject()
  await startPushpin(project, log)
})
