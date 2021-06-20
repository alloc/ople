import napibindings
import nimdbx
import tables
import streams
import cbor

var db {.noinit.}: Database

init proc(exports: Module) =

  exports.registerFn(1, "open"):
    db = openDatabase("ople_data")
    return undefined()

  var collections: Table[string, Collection]
  var snapshots = initTable[pointer, Snapshot]()
  var transactions = initTable[pointer, Transaction]()

  proc toCollection(this: napi_value): Collection =
    let self = this["_collection"]
    assert(self != nil)
    return self.getExternal[]

  proc toSnapshot(this: napi_value): Snapshot =
    let self = this["_snapshot"]
    assert(self != nil)
    return self.getExternal[]

  proc toTransaction(this: napi_value): Transaction =
    let self = this["_transaction"]
    assert(self != nil)
    return self.getExternal[]

  fn(0, beginSnapshot):
    let self = this.toCollection
    let snapshot = self.beginSnapshot()
    snapshots[self] = snapshot

    let snapshotRef = createExternal(
      addr snapshot,
      proc () = snapshots.del(self)
    )

    let handle = exports.create { "_snapshot": snapshotRef }
    handle["__proto__"] = SnapshotMethods
    return handle

  # fn(0, beginTransaction):
  #   let t = this.toCollection.beginTransaction()
  #   let handle = exports.create { "_transaction": createExternal(addr t) }
  #   handle["__proto__"] = TransactionMethods
  #   return handle

  let CollectionMethods = exports.create {
    "beginSnapshot": beginSnapshot,
    # "beginTransaction": beginTransaction,
  }

  proc toJS(node: CborNode): napi_value =
    result = case node.kind:
      of cborMap: node.toJSObject
      of cborArray: node.toJSArray
      of cborText: %node.text
      of cborFloat: %node.float
      elif node.isBool: %node.getBool
      elif node.isNull: null()
      else: nil

  proc toJSArray(node: CborNode): napi_value =
    var arr: openarray[napi_value]
    for value in node.seq:
      arr.add value.toJS
    return %arr

  proc toJSObject(node: CborNode): napi_value =
    var obj: openarray[(string, napi_value)]
    for key, value in node.map:
      obj.add (key.text, value.toJS)
    return %obj

  fn(1, getDocument):
    let id = args[0].getStr
    let doc = this.toSnapshot.get id
    if doc.exists:
      return parseCbor(doc).toJS
    return null()

  fn(1, hasDocument):
    let id = args[0].getStr
    let doc = this.toSnapshot.get id
    return %doc.exists

  fn(0, finishSnapshot):
    this.toSnapshot.finish()
    return nil

  let SnapshotMethods = exports.create {
    "get": getDocument,
    "has": hasDocument,
    "finish": finishSnapshot,
  }

  proc isValidCbor(jsKind: NapiKind): bool =
    jsKind == napi_null ||
    jsKind == napi_boolean ||
    jsKind == napi_number ||
    jsKind == napi_string ||
    jsKind == napi_object

  proc writeCbor(stream: Stream, jsValue: napi_value) =
    stream.writeCbor stream, jsValue, jsValue.kind

  proc writeCbor(stream: Stream, jsValue: napi_value, jsKind: NapiKind) =
    stream.writeCbor case jsKind:
      of napi_null: %nil
      of napi_boolean: jsValue.getBool
      of napi_number: jsValue.getFloat64
      of napi_string: jsValue.getStr
      of napi_object:
        if jsValue.isArray:
          let count = jsValue.getArrayLength
          stream.writeCborArrayLen count
          var index = 0
          while index < count:
            let element = jsValue.getElement(index)
            let elementKind = element.kind
            if not elementKind.isValidCbor:
              raise newException(ValueError, "array element cannot be encoded")
            stream.writeCbor element, elementKind
            inc index
        else:
          var data = newSeq[tuple[name: string, value: napi_value]]()

          let names = jsValue.getPropertyNames
          let count = names.getArrayLength
          var index = 0
          while index < count:
            let name = names.getElement index
            inc index

            let value = jsValue.getProperty name
            let valueKind = value.kind
            if valueKind.isValidCbor:
              data.add (name, value)

          stream.writeCborMapLen data.len
          for name, value in data:
            stream.writeCbor name
            stream.writeCbor value

  fn(2, putDocument):
    let id = args[0].getStr
    let stream = newStringStream()
    stream.writeCbor args[1]
    this.toTransaction.put id, stream.data

  fn(0, abortTransaction):
    this.toTransaction.finish()
    return nil

  let TransactionMethods = exports.create {
    "put": putDocument,
    "finish": abortTransaction,
  }

  TransactionMethods["__proto__"] = SnapshotMethods

  exports.registerFn(1, "createCollection"):
    let name = args[0].getStr
    let collection = db.createCollection(name)
    collections[name] = collection

    let collectionRef = createExternal(
      addr collection,
      proc () = collections.del(name)
    )

    let handle = exports.create { "_collection": collectionRef }
    handle["__proto__"] = CollectionMethods
    return handle

# type Ref = object
#   collection: string
#   id: string

# enum Operation
#   GET
#   PUT
