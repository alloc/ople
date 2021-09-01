import { events } from '../events'
import { fatal } from 'misty'
import log from 'lodge'
import cac from 'cac'

events.on('error', onError)

const app = cac()

app.command('dev').action(runCommand('./dev'))

app.help().parse()

function runCommand(id: string) {
  return (...args: any[]) => require(id).default(...args)
}

function onError(error: { code: string; [key: string]: any }) {
  switch (error.code) {
    case 'docker unauthorized':
      fatal(`must call ${log.yellow('docker login')} first`)
    case 'docker pull failed':
      fatal(`could not fetch Docker image (${log.yellow(error.imageId)})`)
  }
}
