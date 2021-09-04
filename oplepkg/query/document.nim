{.experimental: "notnil".}
import nimdbx
import tables
import times
import ../data/from_cbor
import ../query
import ../ref
import ./collection

proc parseDocument*(data: string): OpleObject =
  for key, value in parseCbor(data).map:
    result[key.text] = newOpleData(value)

proc getDocument*(query: OpleQuery, col: Collection not nil, id: string): OpleObject =
  let doc = col.with(query.snapshot).get id
  if not doc.exists:
    query.fail "instance not found", "Document not found."
  return parseDocument $doc

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
  props["ts"] = \(query.now.toUnixFloat * 1e6)
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
  props["ts"] = \(query.now.toUnixFloat * 1e6)
  col.with(query.transaction).put docRef.id, serializeDocument(props)
  return \{
    "ref": \docRef,
    "data": props["data"],
    "ts": props["ts"],
  }

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
