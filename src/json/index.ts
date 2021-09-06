import { jsonReplacer } from './replacer'
import { jsonReviver } from './reviver'

export const OpleJSON = {
  parse: (json: string) => JSON.parse(json, jsonReviver),
  stringify: (data: any) => JSON.stringify(data, jsonReplacer),
  replace: jsonReplacer,
  revive: jsonReviver,
}
