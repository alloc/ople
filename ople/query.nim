import tables

type OpleQuery* = ref object of RootObj

type OpleData* = ref object of OpleQuery

type OpleNull* = ref object of OpleData

type OpleBool* = ref object of OpleData
  data*: bool

type OpleInteger* = ref object of OpleData
  data*: int64

type OpleDouble* = ref object of OpleData
  data*: float64

type OpleString* = ref object of OpleData
  data*: string

type OpleDate* = ref object of OpleData
  data*: string

type OpleTime* = ref object of OpleData
  data*: string

type OpleObject* = ref object of OpleData
  data*: Table[string, OpleQuery]

type OpleArray* = ref object of OpleData
  data*: seq[OpleQuery]

type OpleCursor* = ref object of OpleData
  data*: any

type OplePage* = ref object of OpleData
  data*: seq[OpleData]
  before*: OpleCursor
  after*: OpleCursor

type OpleRef* = ref object of OpleData
  id*: string

type OpleCollectionRef* = ref object of OpleRef

type OpleDocumentRef* = ref object of OpleRef
  collection*: OpleCollectionRef

type OpleDocument* = ref object of OpleObject
  `ref`*: OpleDocumentRef
  ts*: OpleTime

type OpleCall* = ref object of OpleQuery
  callee*: string
  arguments*: seq[OpleQuery]

type OpleSet* = ref object of OpleData
  query*: OpleCall
