import { codeFrameColumns } from '@babel/code-frame'
import { parse as parseStack } from 'stacktrace-parser'
import fs from 'fs'

require('source-map-support').install({
  hookRequire: true,
})

process.on('uncaughtException', error => {
  if (error.stack) {
    const stack = parseStack(error.stack)
    let i = -1
    while (++i < stack.length) {
      const { file, lineNumber, column } = stack[i]
      if (!file || !lineNumber) continue
      try {
        const code = fs.readFileSync(file, 'utf8')
        const codeFrame = codeFrameColumns(
          code,
          {
            start: {
              line: lineNumber,
              column: column ? column : undefined,
            },
          },
          {
            message: error.message,
            highlightCode: true,
          },
        )
        error.stack = codeFrame + '\n\n' + error.stack
        break
      } catch (e) {
        if (e.code !== 'ENOENT') throw e
      }
    }
  }
  console.error(error.stack || error)
  console.log('')
  process.exit(1)
})
