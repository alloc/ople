import cbor
import ./data/from-cbor
import ./query

proc getDocument*(query: OpleQuery, docRef: OpleRef): OpleData =
  let col = query.database.openCollectionOrNil docRef.collection
  if col == nil:
    query.fail "invalid ref", badCollectionRef(docRef.collection)
  else:
    let doc = col.with(query.snapshot).get docRef.id
    if doc.exists: newOpleObject(parseCbor(doc))
    else:
      query.fail "instance not found", "Document not found."

fn(1, hasDocument):
  let id = args[0].getStr
  let doc = this.toSnapshot.get id
  return \doc.exists

fn(2, putDocument):
  let id = args[0].getStr
  let stream = newStringStream()
  stream.writeCbor args[1]
  this.toTransaction.put id, stream.data
