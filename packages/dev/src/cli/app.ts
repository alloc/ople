import cac from 'cac'
import log from 'lodge'
import exec from '@cush/exec'
import Enquirer from 'enquirer'
import { findConfig, loadConfig, projects } from '@ople/config'
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

export async function loadProject(cwd = process.cwd()) {
  const configPath = findConfig(cwd)
  if (!configPath) {
    throw fatal('cannot find ople.ts')
  }
  loadConfig(configPath)
  const name = await selectProject()
  return projects[name]
}

async function selectProject() {
  const names = Object.keys(projects)
  if (names.length == 1) {
    return names[0]
  }
  type Selection = { name: string }
  const { name } = await Enquirer.prompt<Selection>([
    {
      type: 'select',
      name: 'name',
      message: 'Select a project',
      choices: names,
    },
  ])
  return name
}
