import WebSocket from 'ws'
import StackTracey from 'stacktracey'
import * as sourceMapSupport from 'source-map-support'
import { gray, red, bold } from 'kleur'

sourceMapSupport.install({
  hookRequire: true,
})

Object.assign(global, { WebSocket })

process.on('uncaughtException', onError)
process.on('uncaughtRejection', onError)

function onError(err: any) {
  console.log('')
  if (!(err instanceof Error)) {
    console.error(bold(red('Error')), err)
  } else {
    let type = err.constructor.name
    let text = err.message
    if (text !== (text = text.replace('Invariant failed: ', ''))) {
      type = 'Invariant'
    } else if (text !== (text = text.replace('TypeError: ', ''))) {
      type = 'TypeError'
    }
    console.error(
      bold(red(type)) +
        ' ' +
        text +
        '\n' +
        gray(getStackTrace(err).replace(/(^|\n)/g, '$1  '))
    )
  }
}

function getStackTrace(err: Error) {
  let trace = new StackTracey(err)
  if (err.constructor !== SyntaxError) {
    let showNext = false
    const filteredTrace = trace.withSources().filter((entry, i, entries) => {
      if (showNext) {
        showNext = false
        return true
      }
      const prevEntry = i > 0 && entries[i - 1]
      if (prevEntry && prevEntry.fileName.includes('tiny-invariant')) {
        showNext = true
        return true
      }
      if (entry.file && entry.fileRelative.startsWith('../client')) {
        return true
      }
      return (
        !!entry.file &&
        !entry.thirdParty &&
        !entry.file.startsWith('node:') &&
        !entry.fileRelative.startsWith('../')
      )
    })
    if (filteredTrace.items.length) {
      trace = filteredTrace
    }
  }
  return trace.asTable()
}
