import cbor
import nimdbx
import streams
import tables
import times
import ../data/from_cbor
import ../data/to_cbor
import ../query
import ../ref

proc serializeDocument(props: OpleObject): string =
  let stream = newStringStream()
  stream.writeCbor props
  stream.data

template getCollection*(query: OpleQuery, name: string): Collection =
  result = query.database.openCollectionOrNil name
  if result == nil:
    query.fail "invalid ref", badCollectionRef name

template getDocument*(query: OpleQuery, col: Collection, id: string): OpleObject =
  let doc = col.with(query.snapshot).get id
  if not doc.exists:
    query.fail "instance not found", "Document not found."
  return newOpleObject parseCbor $doc

template getDocument*(query: OpleQuery, docRef: OpleRef): OpleObject =
  let col = query.getCollection(docRef.collection)
  return query.getDocument(col, docRef.id)

template newDocumentId*(query: OpleQuery): string =
  $newSnowflakeId(query.now.toTime)

proc hasDocument*(docRef: OpleRef) {.query.} =
  let col = getCollection(docRef.collection)
  let doc = col.with(query.snapshot).get docRef.id
  return \doc.exists

# TODO: validate props
proc newDocument*(colRef: OpleRef, props: OpleObject) {.query.} =
  let col = query.getCollection(colRef.id)
  let docId = query.newDocumentId()
  props["ts"] = \int64(query.now.toUnixFloat)
  col.with(query.transaction).put docId, serializeDocument(props)
  return \{
    "ref": newOpleRef(docId, colRef.id),
    "data": props.getOrDefault("data", \nil),
    "ts": props["ts"],
  }

proc getDocument*(docRef: OpleRef) {.query.} =
  let props = query.getDocument(docRef)
  return \{
    "ref": docRef,
    "data": props.getOrDefault("data", \nil),
    "ts": props["ts"],
  }

proc setDocumentData*(docRef: OpleRef, data: OpleObject) {.query.} =
  let col = getCollection(docRef.collection)
  var props = query.getDocument(col, docRef.id)
  props["data"] = data
  props["ts"] = int64(query.now.toUnixFloat)
  col.with(query.transaction).put docRef.id, serializeDocument(props)
  return \{
    "ref": docRef,
    "data": props["data"],
    "ts": props["ts"],
  }
