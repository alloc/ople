import napibindings
import ./types

proc toJS*(query: OpleCall, `env$`: napi_env): any =
  query.callee

proc toJS*(data: OpleData, `env$`: napi_env): any = discard
