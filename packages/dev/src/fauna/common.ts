import { Project } from '@ople/config'

export const getServerId = (project: Project) => 'faunadb.' + project.name
