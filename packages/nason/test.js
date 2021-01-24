const {Ref} = require('fauna-lite')

n = require('./')

let nextId = 1
class Record {
  id = ++nextId
  static pack(self) {
    return [self.id]
  }
  static unpack([id]) {
    let self = Object.create(Record.prototype)
    self.id = id
    return self
  }
}

be = n.makeBatchEncoder({ Record })

const ref = new Ref('test')
const rec = new Record()

console.log(ref.toString())

s = be.serialize([
  new Map(),
  [ref],
  [],
  [rec],
])

console.log(be.deserialize(s))
