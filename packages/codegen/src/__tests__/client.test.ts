import path from 'path'
import { printClientModule } from '../client'
import { createParser } from '../parser'

test('basic example', async () => {
  const parser = await createParser(
    path.resolve(__dirname, '../__fixtures__/project')
  )
  try {
    console.log(printClientModule(parser))
  } finally {
    parser.close()
  }
})
