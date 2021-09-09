import fs from 'fs'
import path from 'path'

export function editJsonFile(file: string) {
  let data: any
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    data = {}
  }
  file = path.resolve(file)
  return {
    data,
    save() {
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(file, JSON.stringify(data))
    },
  }
}
