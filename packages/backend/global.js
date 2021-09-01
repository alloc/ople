Object.assign(global, require('./').env)

//
// Polyfills
//

const { StringDecoder } = require('string_decoder')

global.TextEncoder = function TextEncoder() {
  this.encode = encodeUTF8
}

global.TextDecoder = function TextDecoder() {
  this.decode = decodeUTF8
}

function encodeUTF8(s) {
  const chars = unescape(encodeURIComponent(s))
  const bytes = new Uint8Array(chars.length)
  for (let i = 0; i < chars.length; i++) {
    bytes[i] = chars[i].charCodeAt(0)
  }
  return bytes
}

function decodeUTF8(s) {
  return new StringDecoder().end(Buffer.from(s))
}
