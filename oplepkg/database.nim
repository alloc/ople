import nimdbx
import strutils
import ./query

export nimdbx

type OpleSchema* = enum
  ople_collections
  ople_indexes

proc initDatabase*(path: string): Database =
  let db = openDatabase path
  discard db.createCollection $ople_collections
  discard db.createCollection $ople_indexes
  return db

proc isSchemaRef*(docRef: OpleRef): bool =
  ## This ref exists in a schema collection.
  try:
    discard parseEnum[OpleSchema](docRef.collection)
    true
  except:
    false

template getSchema*(query: OpleQuery, schema: OpleSchema): Collection =
  query.database.openCollection $schema

template getReadableSchema*(query: OpleQuery, schema: OpleSchema): CollectionSnapshot =
  query.getSchema(schema).with(query.snapshot)

template getWritableSchema*(query: OpleQuery, schema: OpleSchema): CollectionTransaction =
  query.getSchema(schema).with(query.transaction)

proc newCollectionRef*(collection: string): OpleRef =
  ## Convert a collection name into an OpleRef.
  var id, scope: string

  case collection
  of $ople_collections:
    id = "collections"
  of $ople_indexes:
    id = "indexes"
  else:
    id = collection
    scope = $ople_collections

  OpleRef(id: id, collection: scope)
