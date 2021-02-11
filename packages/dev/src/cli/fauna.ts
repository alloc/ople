import { app, log, checkDocker, loadProject } from './app'
import { startFauna } from '../..'

app.command('fauna start', 'Start the FaunaDB server').action(async () => {
  await checkDocker()
  const project = await loadProject()
  await startFauna(project, log)
})
