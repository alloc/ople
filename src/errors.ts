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
    nativeStack: string,
  ) {
    super(description)
    this.stack = popStackFrames(this, 6)?.replace(
      description,
      description + nativeStack,
    )
  }
}

function popStackFrames(error: Error, count: number) {
  if (!error.stack) return
  const stack = error.stack.split('\n')
  count += error.message.split('\n').length
  const message = error.constructor.name + ': ' + error.message
  return message + '\n' + stack.slice(count).join('\n')
}
