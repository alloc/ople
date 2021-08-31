import fs from 'saxon/sync'
import log from 'lodge'
import { clear } from 'misty'
import { startTask } from 'misty/task'
import { codeFrameColumns } from '@babel/code-frame'
import { OpleParser, printClientModule, warningsByFile } from '@ople/codegen'
import { relativeToCwd } from '../common'

export function generateModules(root: string, clientModulePath: string) {
  const parser = new OpleParser(root)

  function generate() {
    clear()
    const task = startTask('Generating modules...')
    try {
      fs.write(clientModulePath, printClientModule(parser))
      task.finish('Modules generated')
      printWarnings()
    } catch (err) {
      task.finish()
      log.error(err)
    }
  }

  function printWarnings() {
    for (const [file, warnings] of warningsByFile) {
      // log.gray(relativeToCwd(file.getFilePath(), root))
      const code = file.getFullText()
      for (const warning of warnings) {
        log(
          codeFrameColumns(code, warning.location, {
            message: warning.message,
            highlightCode: true,
          }) + '\n'
        )
      }
    }
    warningsByFile.clear()
  }

  return new Promise<OpleParser>(resolve => {
    parser.on('update', generate).on('ready', () => {
      generate()
      resolve(parser)
    })
  })
}
