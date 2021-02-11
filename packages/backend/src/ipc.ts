import net from 'net'

const sockets: { [port: number]: Promise<net.Socket> } = {}

export const ipc = {
  async send(port: number, buffer: Uint8Array) {
    const socket = await (sockets[port] || (sockets[port] = connect(port)))
    socket.write(buffer)
  },
}

function connect(port: number) {
  return new Promise<net.Socket>(resolve => {
    const socket = new net.Socket()
    socket.connect({ port }, () => resolve(socket))
  })
}
