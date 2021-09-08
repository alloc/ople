import WebSocket from 'ws'
import StackTracey from 'stacktracey'
import { gray, red, bold } from 'kleur'

Object.assign(global, { WebSocket })

process.on('uncaughtException', onError)
process.on('uncaughtRejection', onError)

function onError(err: any) {
  console.log('')
  if (!(err instanceof Error)) {
    console.error(bold(red('Error')), err)
  } else {
    console.error(
      bold(red(err.constructor.name)) +
        ' ' +
        err.message +
        '\n' +
        gray(
          new StackTracey(err)
            .withSources()
            .filter(
              entry =>
                !entry.thirdParty &&
                !entry.file.startsWith('node:') &&
                !entry.fileRelative.startsWith('../')
            )
            .asTable()
            .replace(/(^|\n)/g, '$1  ')
        )
    )
  }
}
