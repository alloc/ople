import cac from 'cac'
import log from 'lodge'
import exec from '@cush/exec'
import { getCommandPath } from '../common'

export const app = cac()

export { default as log } from 'lodge'

export function fatal(reason: string) {
  log(log.red('[!]'), reason)
  process.exit(1)
}

export async function checkDocker() {
  if (!getCommandPath('docker')) {
    const link = 'https://www.docker.com/products/docker-desktop'
    throw fatal(`Docker must be installed: ${link}`)
  }
  try {
    await exec('docker ps')
  } catch {
    throw fatal('Docker must be running')
  }
}
