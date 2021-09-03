import nimdbx
import ./query

export nimdbx

type OpleSchema* = enum
  ople_collections

proc initDatabase*(path: string): Database =
  let db = openDatabase path
  discard db.createCollection $ople_collections
  return db

template getSchema*(query: OpleQuery, schema: OpleSchema): Collection =
  query.database.openCollection $schema

template getReadableSchema*(query: OpleQuery, schema: OpleSchema): CollectionSnapshot =
  query.getSchema(schema).with(query.snapshot)

template getWritableSchema*(query: OpleQuery, schema: OpleSchema): CollectionTransaction =
  query.getSchema(schema).with(query.transaction)