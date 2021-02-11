import fs from 'saxon/sync'
import exec from '@cush/exec'
import path from 'path'
import lodge from 'lodge'
import makeUid from 'uid'
import { Project } from '@ople/config'
import {
  ensureImageExists,
  findContainerByPort,
  getContainerId,
  italic,
  killContainer,
} from '../common'
import { getServerId, getPaths } from './common'

export async function startPushpin(project: Project, log = lodge.quiet) {
  const { configDir, pushpinConf, routesFile } = getPaths(project)
  const name = getServerId(project)

  const containerId = await getContainerId(name)
  if (!containerId) {
    for (const port of [7999, 5560]) {
      const containerId = await findContainerByPort(port)
      if (containerId) {
        // TODO: use enquirer to ask if allowed to remove
        log('docker rm', log.yellow(containerId))
        await killContainer(containerId)
      }
    }

    fs.mkdir(configDir)
    fs.write(routesFile, `* host.docker.internal:${project.port},over_http`)

    if (!fs.exists(pushpinConf)) {
      const sigKey = project.gripSig || (project.gripSig = makeUid())
      const contents = fs.read(path.resolve(__dirname, '../../pushpin.conf'))
      fs.write(pushpinConf, contents.replace('changeme', sigKey))
    }

    const pushpinImageId = 'fanout/pushpin:1.30.0'
    await ensureImageExists(pushpinImageId)

    log('pushpin', log.gray('starting...'))
    await exec(
      `docker run -d --rm
      --name "${name}"
      -v ${configDir}:/etc/pushpin/
      -p 7999:7999
      -p 5560-5563:5560-5563
      ${pushpinImageId}`
    )
  }

  if (!project.gripSig) {
    project.gripSig = readGripSig(pushpinConf)
  }

  log('pushpin', italic(log.yellow('is running')))
}

function readGripSig(pushpinConf: string) {
  const content = fs.read(pushpinConf)
  const match = /\s+sig_key=([^\n]+)/.exec(content)
  if (!match) {
    throw Error('Missing "proxy.sig_key" in pushpin.conf')
  }
  return match[1]
}
