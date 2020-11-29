import exec from '@cush/exec'
import path from 'path'
import os from 'os'

export { default as italic } from 'ansi-italic'

export interface PackageJson {
  main: string
  ople?: OpleConfig
}

export interface OpleConfig {
  /**
   * Used to identify Docker containers related to this project.
   */
  serverId: string
  /**
   * The path to the generated API client.
   *
   * Be sure to omit `.d.ts` extension.
   */
  clientModuleId: string
  /**
   * Used as the identifier of the exported `createClient` result.
   *
   * Defaults to `client`
   */
  clientExportId?: string
  /**
   * The parent directory of the generated queries module.
   *
   * Defaults to `./src/queries`
   */
  queriesRoot?: string
  /**
   * Limit the memory used by the local FaunaDB instance.
   */
  faunaMemoryLimit?: string
  /**
   * The token used to sign requests from the Pushpin proxy.
   *
   * Defaults to a PRNG-based identifier which is cached locally.
   */
  gripSig?: string
  /**
   * Override the port used by the HTTP server.
   *
   * Defaults to `process.env.PORT || 8000`
   */
  port?: number
}

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
