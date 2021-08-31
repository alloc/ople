import { events } from '../events'
import { app, fatal, log } from './app'

events.on('error', onError)

const command = process.argv[2]

if (!command || /^(--help|-h)$/.test(command)) {
  require('./start')
  require('./build')
  require('./pushpin')
  require('./fauna')
  app.outputHelp()
} else {
  require('./' + command)
  app.help().parse()
}

function onError(error: { code: string; [key: string]: any }) {
  switch (error.code) {
    case 'docker unauthorized':
      fatal(`must call ${log.yellow('docker login')} first`)
    case 'docker pull failed':
      fatal(`could not fetch Docker image (${log.yellow(error.imageId)})`)
  }
}
