export const notImplemented = {
  message: 'Not implemented',
  get stack() {
    return new Error(this.message).stack
  },
}

export class OpleQueryError extends Error {
  constructor(
    readonly code: string,
    description: string,
    readonly position: string[],
  ) {
    super(description)
  }
}

export function popStackFrames(error: Error, count: number) {
  if (!error.stack) return
  const stack = error.stack.split('\n')
  count += error.message.split('\n').length
  const message = error.constructor.name + ': ' + error.message
  error.stack = message + '\n' + stack.slice(count).join('\n')
}
