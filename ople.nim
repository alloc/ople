{.experimental: "notnil".}
import napibindings
import nimdbx
import tables
import streams
import cbor

var db {.noinit.}: Database

var collections = initTable[string, Collection]()
var snapshots = initTable[pointer, Snapshot]()
var transactions = initTable[pointer, Transaction]()

var CollectionMethods {.noinit.}: napi_value
var SnapshotMethods {.noinit.}: napi_value
var TransactionMethods {.noinit.}: napi_value

proc toCollection(this: napi_value): auto =
  let self = this["_collection"]
  assert(self != nil)
  cast[Collection not nil](self.getExternal)

proc toSnapshot(this: napi_value): auto =
  let self = this.toCollection
  let selfPtr = cast[pointer](self)
  let snapshot = snapshots[selfPtr]
  return self.with(snapshot)

proc toTransaction(this: napi_value): auto =
  let self = this.toCollection
  let selfPtr = cast[pointer](self)
  let transaction = transactions[selfPtr]
  return self.with(transaction)

init proc(exports: Module) =

  exports.registerFn(1, "open"):
    db = openDatabase(args[0].getStr)
    return undefined()

  fn(1, getDocument):
    let id = args[0].getStr
    let doc = this.toSnapshot.get id
    if doc.exists:
      return parseCbor(doc).toJS
    return null()

  fn(1, hasDocument):
    let id = args[0].getStr
    let doc = this.toSnapshot.get id
    return \doc.exists

  fn(0, finishSnapshot):
    this.toSnapshot.finish()
    return nil

  SnapshotMethods = \{
    "get": getDocument,
    "has": hasDocument,
    "finish": finishSnapshot,
  }

  fn(2, putDocument):
    let id = args[0].getStr
    let stream = newStringStream()
    stream.writeCbor args[1]
    this.toTransaction.put id, stream.data

  fn(0, abortTransaction):
    this.toTransaction.finish()
    return nil

  TransactionMethods = \{
    "put": putDocument,
    "finish": abortTransaction,
    "__proto__": SnapshotMethods,
  }

  fn(0, beginSnapshot):
    let self = this.toCollection
    let snapshot = db.beginSnapshot()

    let selfPtr = cast[pointer](self)
    snapshots[selfPtr] = snapshot

    let collectionRef = selfPtr.createExternal(
      proc (data: pointer) =
        snapshots.del(selfPtr)
    )

    let handle = \{ "_collection": collectionRef }
    handle["__proto__"] = SnapshotMethods
    return handle

  fn(0, beginTransaction):
    let self = this.toCollection
    let transaction = self.beginTransaction()

    let selfPtr = cast[pointer](self)
    transactions[selfPtr] = transaction.transaction

    let collectionRef = selfPtr.createExternal(
      proc (data: pointer) =
        transactions.del(selfPtr)
    )

    let handle = \{ "_collection": collectionRef }
    handle["__proto__"] = TransactionMethods
    return handle

  CollectionMethods = \{
    "beginSnapshot": beginSnapshot,
    "beginTransaction": beginTransaction,
  }

  exports.registerFn(1, "createCollection"):
    let name = args[0].getStr
    let collection = db.createCollection(name)

    collections[name] = collection
    let collectionRef = createExternal(
      cast[pointer](collection),
      proc (data: pointer) =
        collections.del(name)
    )

    let handle = \{ "_collection": collectionRef }
    handle["__proto__"] = CollectionMethods
    return handle
