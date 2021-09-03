import fs from 'saxon/sync'
import log from 'lodge'
import path from 'path'
import { clear } from 'misty'
import { startTask } from 'misty/task'
import { codeFrameColumns } from '@babel/code-frame'
import {
  OpleParser,
  printClientModule,
  printBackendModule,
  warningsByFile,
} from '@ople/codegen'
import { relativeToCwd } from '../common'

export function generateModules(
  root: string,
  clientModulePath: string,
  backendModulePath: string,
  backendUrl: string
) {
  const parser = new OpleParser(root)

  clientModulePath = path.resolve(root, clientModulePath)
  backendModulePath = path.resolve(root, backendModulePath)

  function generate() {
    const task = startTask('Generating modules...')
    try {
      fs.write(clientModulePath, printClientModule(parser, backendUrl))
      fs.write(backendModulePath, printBackendModule(parser))
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
