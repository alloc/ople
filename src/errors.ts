export const notImplemented = {
  message: 'Not implemented',
  get stack() {
    return new Error(this.message).stack
  },
}
