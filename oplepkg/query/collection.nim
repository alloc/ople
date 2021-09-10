{.experimental: "notnil".}
import nimdbx
import ../data/[to_cbor,from_cbor]
import ../database
import ../error
import ../query

proc getCollection*(query: OpleQuery, name: string): Collection not nil =
  var col = query.database.openCollectionOrNil name
  if col == nil:
    query.fail "invalid ref", badCollectionRef name
  # HACK: this proves the result is non-nil
  if col == nil: query.database.openCollection name
  else: col

# TODO: permissions
proc newCollection*(query: OpleQuery, params: OpleObject) =
  let collections = query.getWritableSchema ople_collections
  let name = params["name"].string
  if collections.get(name).exists:
    query.fail "instance already exists", "Collection already exists."
  discard query.database.createCollection(name)
  var props: OpleObject
  props["ts"] = \(query.now.toUnixFloat * 1e6)
  props["data"] = params.getOrDefault("data", \nil)
  props["ttl_days"] = params.getOrDefault("ttl_days", \nil)
  props["history_days"] = params.getOrDefault("history_days", \30)
  collections.put name, serializeDocument(props)

proc deleteCollection*(query: OpleQuery, name: string): OpleData =
  let collections = query.getWritableSchema ople_collections
  let doc = collections.get name
  if not doc.exists:
    query.fail "instance not found", "Document not found."
  collections.del name
  exportDocument(
    newCollectionRef(name),
    parseDocument $doc
  )

proc getDocument*(query: OpleQuery, col: Collection not nil, id: string): OpleObject =
  let doc = col.with(query.snapshot).get id
  if not doc.exists:
    query.fail "instance not found", "Document not found."
  return parseDocument $doc

proc getDocument*(query: OpleQuery, docRef: OpleRef): OpleObject =
  let col = query.getCollection(docRef.collection)
  return query.getDocument(col, docRef.id)
