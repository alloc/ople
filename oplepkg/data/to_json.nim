import std/json
import tables
import times
import ../data

proc `%`*(data: OpleData): JsonNode

proc `%`(arr: OpleArray): JsonNode =
  result = newJArray()
  for elem in arr:
    result.elems.add %elem

# proc `%`*(doc: OpleDocument): JsonNode =
#   %*{ "ref": doc.ref, "data": doc.data, "ts": doc.ts }

# proc `%`*(page: OplePage): JsonNode =
#   %*{ "data": doc.data, "before": doc.before, "after": doc.after }

proc newJObject(error: OpleError, debugPath: seq[string]): JsonNode =
  %{ "@error": %{ "position": %debugPath, "code": %error.code, "description": %error.description } }

proc newJObject(call: OpleCall): JsonNode =
  var node = newJObject()
  for key, val in call.fieldPairs:
    when val is OpleData:
      node.fields[key] = newJNode(val)
  
  %{ "@set": node }

proc `%`*(r: OpleRef): JsonNode =
  var node = newJObject()
  node.fields["id"] = %r.id
  if r.collection == "collections":
    node.fields["collection"] = %newOpleRef("collections", "")
  elif r.collection != "":
    node.fields["collection"] = %newOpleRef(r.collection, "collections")

  %{ "@ref": node }

proc `%`*(obj: OpleObject): JsonNode =
  result = newJObject()
  for key, val in obj:
    result.fields[key] = %val

proc `%`*(data: OpleData): JsonNode =
  case data.kind
  of ople_null: newJNull()
  of ople_bool: %data.bool
  of ople_int: %data.int
  of ople_float: %data.float
  of ople_string: %data.string
  of ople_date: %{ "@date": %data.date.format opleDateFormat }
  of ople_time: %{ "@time": %data.time.format opleTimeFormat }
  of ople_ref: %data.ref
  of ople_document: %data.document
  of ople_object: %data.object
  of ople_array: %data.array
  of ople_error: newJObject(data.error, data.debugPath)
  of ople_page: %data.page
  of ople_set: newJObject(data.set.expr)
  else: 
    raise newException(Defect, $data.kind & " cannot be serialized to JSON")

proc stringify*(data: OpleData): string =
  let json = %data
  $json
