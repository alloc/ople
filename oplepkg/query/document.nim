{.experimental: "notnil".}
import nimdbx
import tables
import times
import ../data/from_cbor
import ../query
import ../ref
import ./collection

proc getDocument*(query: OpleQuery, col: Collection not nil, id: string): OpleObject =
  let doc = col.with(query.snapshot).get id
  if not doc.exists:
    query.fail "instance not found", "Document not found."
  let node = parseCbor $doc
  for key, value in node.map:
    result[key.text] = newOpleData(value)

proc getDocument*(query: OpleQuery, docRef: OpleRef): OpleObject =
  let col = query.getCollection(docRef.collection)
  return query.getDocument(col, docRef.id)

template newDocumentId*(query: OpleQuery): string =
  $newSnowflakeId(query.now)

proc hasDocument*(docRef: OpleRef) {.query.} =
  let col = query.getCollection(docRef.collection)
  let doc = col.with(query.snapshot).get docRef.id
  return \doc.exists

# TODO: validate props
proc newDocument*(colRef: OpleRef, props: var OpleObject) {.query.} =
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
  let data = props.getOrDefault("data", \nil)
  let ts = props["ts"]
  return \{
    "ref": \docRef,
    "data": data,
    "ts": ts,
  }

proc setDocumentData*(docRef: OpleRef, data: OpleObject) {.query.} =
  let col = query.getCollection(docRef.collection)
  var props = query.getDocument(col, docRef.id)
  props["data"] = \data
  props["ts"] = \int64(query.now.toUnixFloat)
  col.with(query.transaction).put docRef.id, serializeDocument(props)
  return \{
    "ref": \docRef,
    "data": props["data"],
    "ts": props["ts"],
  }

proc updateDocument*(docRef: OpleRef, params: OpleObject) {.query.} =
  discard
  # const ts = now()
  # if (data === null) {
  #   if (!this.writer.exists(id)) {
  #     throw Error('Document does not exist: ' + id)
  #   }
  #   // TODO: set data to null
  # } else if (data) {
  #   const oldData = this.writer.get(id)
  #   if (!oldData) {
  #     throw Error('Document does not exist: ' + id)
  #   }
  #   data = merge(oldData, data)
  #   this.writer.update(id, { ...data, '@ts': ts })
  #   return this.toDocument(id, data, ts)
  # }
  # throw Error('todo')

proc mergeProperties*(oldProps: OpleObject, newProps: OpleObject): OpleObject =
  discard
  # export function merge(a: any, b: any) {
  #   if (b === undefined) {
  #     return a
  #   }
  #   if (a && b && a.constructor == Object && b.constructor == Object) {
  #     for (const key in b) {
  #       a[key] = merge(a[key], b[key])
  #     }
  #     return a
  #   }
  #   return b
  # }
