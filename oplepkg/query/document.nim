{.experimental: "notnil".}
import nimdbx
import tables
import times
import ../data/to_cbor
import ../database
import ../query
import ../ref
import ./collection

template newDocumentId*(query: OpleQuery): string =
  $newSnowflakeId(query.now)

proc hasDocument*(query: OpleQuery, docRef: OpleRef): bool =
  let col = query.getCollection(docRef.collection)
  let doc = col.with(query.snapshot).get docRef.id
  return doc.exists

proc hasDocument*(docRef: OpleRef) {.query.} =
  return \query.hasDocument(docRef)

proc newDocument*(query: OpleQuery, docRef: OpleRef, props: var OpleObject, unsafe = false) =
  let col = query.getCollection(docRef.collection).with(query.transaction)
  if unsafe or not col.get(docRef.id).exists:
    props["ts"] = \(query.now.toUnixFloat * 1e6)
    col.put(docRef.id, serializeDocument props)
  else:
    query.fail "instance already exists", "Document already exists."

# TODO: validate props
proc newDocument*(colRef: OpleRef, props: var OpleObject) {.query.} =
  let docId = query.newDocumentId()
  let docRef = OpleRef(id: docId, collection: colRef.id)
  query.newDocument docRef, props, true
  exportDocument docRef, props

proc getDocument*(docRef: OpleRef) {.query.} =
  exportDocument docRef, query.getDocument(docRef)

proc setDocumentData*(docRef: OpleRef, data: OpleObject) {.query.} =
  let col = query.getCollection(docRef.collection)
  var props = query.getDocument(col, docRef.id)
  props["data"] = \data
  props["ts"] = \(query.now.toUnixFloat * 1e6)
  col.with(query.transaction).put docRef.id, serializeDocument(props)
  exportDocument docRef, props

proc deleteDocument*(docRef: OpleRef) {.query.} =
  case docRef.collection
  of $ople_collections:
    result = query.deleteCollection docRef.id
  of $ople_indexes:
    result = query.deleteIndex docRef.id
  else:
    result = query.getDocument(arguments)
    let col = query.getCollection(docRef.collection)
    col.with(query.transaction).del docRef.id

proc updateDocument*(docRef: OpleRef, params: OpleObject) {.query.} =
  let col = query.getCollection(docRef.collection)
  var props = query.getDocument(col, docRef.id)

  # TODO: support other params
  if params.hasKey("data"):
    let newData = params["data"]
    if newData.kind == ople_object:
      if props["data"].kind == ople_null:
        props["data"] = newData
      else:
        # TODO: deep merging
        var data = addr props["data"].object
        for key, val in newData.object:
          data[][key] = val

  props["ts"] = \(query.now.toUnixFloat * 1e6)
  col.with(query.transaction).put docRef.id, serializeDocument(props)
  return \{
    "ref": \docRef,
    "data": props["data"],
    "ts": props["ts"],
  }

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
