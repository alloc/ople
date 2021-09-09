import nimdbx
import ../query
import ./document

proc toIndexKey(data: OpleData): Collatable =
  case data.kind
  of ople_int:
    result.add data.int
  of ople_string:
    result.add data.string
  of ople_bool:
    result.add data.bool
  of ople_array:
    for val in data.array:
      case val.kind
      of ople_int:
        result.add val.int
      of ople_string:
        result.add val.string
      of ople_bool:
        result.add val.bool
      of ople_null:
        result.addNull()
      else: 
        raise newException(Defect, "Index keys must be an integer, string, boolean, or array")
  of ople_null:
    discard
  else:
    raise newException(Defect, "Index keys must be an integer, string, boolean, or array")

proc createIndex*(params: OpleObject) {.query.} =
  let name = params["name"].string
  let source = params["source"].ref
  let collate = params["collate"].invoke
  let collection = query.database.openCollection(source.id)

  discard collection.openIndex(name) do (id, dataPtr: DataOut, emit: EmitFunc) -> void:
    {.cast(noSideEffect).}:
      let data = parseDocument $dataPtr
      let indexKey = collate(newOpleObject(data)).toIndexKey
      if not indexKey.isEmpty:
        var indexValue: Collatable
        indexValue.add $id
        emit(indexKey, indexValue)

  return \nil
