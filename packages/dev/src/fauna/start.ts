import path from 'path'
import exec from '@cush/exec'
import lodge from 'lodge'
import { Project } from '@ople/config'
import {
  findContainerByPort,
  getContainerId,
  italic,
  killContainer,
} from '../common'
import { getServerId } from './common'

export async function startFauna(config: Project, log = lodge.quiet) {
  const name = getServerId(config)
  const containerId = await getContainerId(name)
  if (!containerId) {
    for (const port of [8443, 8084]) {
      const containerId = await findContainerByPort(port)
      if (containerId) {
        // TODO: use enquirer to ask if allowed to remove
        log('docker rm', log.yellow(containerId))
        await killContainer(containerId)
      }
    }

    const cachePath = path.resolve('.faunadb')
    const ramLimit = config.faunaMemoryLimit

    log('faunadb', log.gray('starting...'))
    await exec(
      `docker run -d --rm
      --name "${name}"
      ${ramLimit ? `--memory="${ramLimit}"` : ''}
      -v ${cachePath}:/var/lib/faunadb
      -v ${cachePath}/log:/var/log/faunadb
      -p 8443:8443
      -p 8084:8084
      fauna/faunadb:2.12.2
      --init`
    )
  }
  log('faunadb', italic(log.yellow('is running')))
}
