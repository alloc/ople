import path from 'path'
import { Project } from '@ople/config'

export function getServerId(project: Project) {
  return 'pushpin.' + project.name
}

export function getPaths(project: Project) {
  const configDir = project.resolve('.pushpin')
  return {
    configDir,
    routesFile: path.join(configDir, 'routes'),
    pushpinConf: path.join(configDir, 'pushpin.conf'),
  }
}
