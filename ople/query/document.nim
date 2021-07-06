import cbor
import ../collection
import ../data/from_cbor
import ../query

proc getDocument*(r: OpleRef) {.query.} =
  let col = toCollection(r)
  let doc = col.with(query.snapshot).get r.id
  if doc.exists: newOpleObject parseCbor(doc)
  else:
    query.fail "instance not found", "Document not found."


proc hasDocument*() {.query.} = discard

proc putDocument*() {.query.} = discard

fn(1, hasDocument):
  let id = args[0].getStr
  let doc = this.toSnapshot.get id
  return \doc.exists

fn(2, putDocument):
  let id = args[0].getStr
  let stream = newStringStream()
  stream.writeCbor args[1]
  this.toTransaction.put id, stream.data
