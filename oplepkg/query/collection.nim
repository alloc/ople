{.experimental: "notnil".}
import streams
import ../data/to_cbor
import ../database
import ../error
import ../query

proc serializeDocument*(props: OpleObject): string =
  let stream = newStringStream()
  stream.writeCbor props
  stream.data

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
