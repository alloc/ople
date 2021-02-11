import { loadContext } from './loader'
import path from 'path'

export const projects: { [name: string]: Project } = {}

export function addProject(opts: ProjectOptions) {
  if (projects[opts.name]) {
    throw Error(`Project named "${opts.name}" already exists`)
  }
  projects[opts.name] = new Project(opts)
}

export interface ProjectOptions {
  name: string
  root?: string
}

export class Project {
  readonly name: string
  readonly root: string
  /**
   * The path to the generated API client.
   *
   * Be sure to omit `.d.ts` extension.
   */
  clientModuleId?: string
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

  constructor(opts: ProjectOptions) {
    if (!opts.root) {
      if (loadContext.cwd) {
        opts.root = loadContext.cwd
      } else throw Error('"root" option must exist')
    }
    this.name = opts.name
    this.root = opts.root
  }

  resolve(...paths: string[]) {
    return path.resolve(this.root, ...paths)
  }
}
