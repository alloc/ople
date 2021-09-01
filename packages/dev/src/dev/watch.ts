import fs from 'saxon/sync'
import log from 'lodge'
import { clear } from 'misty'
import { startTask } from 'misty/task'
import { codeFrameColumns } from '@babel/code-frame'
import { OpleParser, printClientModule, warningsByFile } from '@ople/codegen'
import { relativeToCwd } from '../common'

export function generateModules(
  root: string,
  clientModulePath: string,
  backendUrl: string
) {
  const parser = new OpleParser(root)

  function generate() {
    const task = startTask('Generating modules...')
    try {
      fs.write(clientModulePath, printClientModule(parser, backendUrl))
      task.finish('Modules generated')
      printWarnings()
    } catch (err) {
      task.finish()
      log.error(err)
    }
  }

  function printWarnings() {
    for (const [file, warnings] of warningsByFile) {
      const fileName = relativeToCwd(file.getFilePath(), root)
      const code = file.getFullText()
      for (const warning of warnings) {
        log('')
        log('  ' + log.gray(fileName + ':' + warning.location.start.line))
        log(
          codeFrameColumns(code, warning.location, {
            message: warning.message,
            highlightCode: true,
          })
        )
      }
      log('')
    }
    warningsByFile.clear()
  }

  return new Promise<OpleParser>(resolve => {
    parser
      .on('ready', () => {
        generate()
        resolve(parser)
      })
      .on('update', () => {
        // clear()
        generate()
      })
  })
}
