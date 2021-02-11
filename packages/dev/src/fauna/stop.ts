import lodge from 'lodge'
import { Project } from '@ople/config'
import { getContainerId, killContainer } from '../common'
import { getServerId } from './common'

export async function stopFauna(project: Project, log = lodge.quiet) {
  const name = getServerId(project)
  const containerId = await getContainerId(name)

  log('docker rm', log.yellow(containerId))
  await killContainer(containerId)
}
