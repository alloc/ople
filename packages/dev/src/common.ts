import exec from '@cush/exec'
import path from 'path'
import os from 'os'
import { events } from './events'

export { default as italic } from 'ansi-italic'

export function relativeToHome(p: string) {
  return p.replace(
    new RegExp('^' + os.homedir().replace(path.sep, '\\/') + '\\/'),
    '~/'
  )
}

/** Get a path relative to cwd */
export function relativeToCwd(p: string, cwd = process.cwd()) {
  p = path.relative(cwd, p)
  return p[0] !== '.' ? './' + p : p
}

export function getCommandPath(cmd: string) {
  try {
    return exec.sync('which ' + cmd)
  } catch {
    return null
  }
}

export function getContainerId(name: string) {
  return exec(`docker ps -q -f name="${name}"`)
}

export async function findContainerByPort(port: number) {
  return exec(`docker ps -q -f expose="${port}"`)
}

export function killContainer(containerId: string) {
  return exec(`docker rm -f ${containerId}`)
}

export async function ensureImageExists(imageId: string) {
  if (!exec.sync(`docker images -q ${imageId}`)) {
    let error: any
    try {
      await exec(
        `docker pull ${imageId}`,
        { stdio: ['ignore', 1, 'pipe'] },
        stderr => {
          if (/unauthorized/.test(stderr)) {
            error = { code: 'docker unauthorized' }
          }
        }
      )
    } catch {
      events.emit('error', error || { code: 'docker pull failed', imageId })
    }
  }
}
