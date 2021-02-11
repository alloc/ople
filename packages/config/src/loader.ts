import os from 'os'
import fs from 'saxon/sync'
import path from 'path'
import requireFromString from 'require-from-string'
import { transform } from 'sucrase'

export function findConfig(cwd: string) {
  let configPath: string | undefined
  for (; cwd !== os.homedir(); cwd = path.dirname(cwd)) {
    configPath = path.join(cwd, 'ople.ts')
    if (fs.isFile(configPath)) {
      return configPath
    }
  }
  return null
}

export function loadConfig(configPath: string) {
  const { code } = transform(fs.read(configPath), {
    transforms: ['imports', 'typescript'],
    filePath: configPath,
  })
  loadContext.cwd = path.dirname(configPath)
  try {
    requireFromString(code, configPath)
  } finally {
    loadContext.cwd = null
  }
}

/** Context for the current `loadConfig` call */
export const loadContext = {
  cwd: null as string | null,
}
