{.experimental: "notnil".}
import nimdbx
from strutils import split
import strformat
import ../data/[to_cbor,from_cbor]
import ../database
import ../query

proc toIndexKey(data: OpleData, nested = false): Collatable =
  case data.kind
  of ople_int:
    result.add data.int
  of ople_string:
    result.add data.string
  of ople_ref:
    let r = data.ref
    result.add r.id & "/" & r.collection
  of ople_bool:
    result.add data.bool
  of ople_array:
    if nested:
      raise newException(Defect, "Index keys cannot use nested arrays")
    for val in data.array:
      result.add toIndexKey(val)
  of ople_null:
    discard
  else:
    raise newException(Defect, "Index keys must be an integer, string, boolean, or array")

proc identifyIndex*(collectionRef: OpleRef, name: string): string =
  &"index::{collectionRef.id}::{name}"

proc getIndexCollection*(query: OpleQuery, collectionRef: OpleRef, name: string): Collection =
  query.database.getOpenCollection identifyIndex(collectionRef, name)

var indexCache: Table[string, Index]

proc createIndex*(query: OpleQuery, collectionRef: OpleRef, name: string, collate: OpleCallback): Collection not nil =
  let indexes = query.getWritableSchema ople_indexes
  let indexId = collectionRef.id & "::" & name

  if indexCache.hasKey(indexId):
    query.fail "instance already exists", "Index already exists."

  if not indexes.get(indexId).exists:
    var props: OpleObject
    props["ts"] = \(query.now.toUnixFloat * 1e6)
    props["data"] = \{ "source": \collectionRef }
    indexes.put indexId, serializeDocument(props)

  proc indexer(id, dataPtr: DataOut, emit: EmitFunc) =
    {.cast(noSideEffect).}:
      let data = parseDocument $dataPtr
      let indexKey = collate(newOpleObject(data)).toIndexKey
      if not indexKey.isEmpty:
        var indexValue: Collatable
        indexValue.add $id
        emit(indexKey, indexValue)

  let collection = query.database.openCollection(collectionRef.id)
  let index = collection.openIndex(name, indexer)
  indexCache[indexId] = index

  cast[Collection not nil](
    query.getIndexCollection(collectionRef, name)
  )

proc deleteIndex*(query: OpleQuery, indexId: string): OpleDocument =    
  let indexes = query.getWritableSchema ople_indexes
  let doc = indexes.get indexId
  if not doc.exists:
    query.fail "instance not found", "Index not found."

  indexes.del indexId

  let index = indexCache.getOrDefault(indexId, nil)
  if not index.isNil:
    deleteIndex index, query.transaction
    indexCache.del indexId

  let collection = indexId.split("::")[0]
  toDocument(
    toCollectionRef(collection),
    parseDocument $doc
  )

