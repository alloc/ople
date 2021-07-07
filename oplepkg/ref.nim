import times

var shard_id: uint8 = 2
var region_id: uint8 = 1

const start_time = 1609459200000 # 2021-01-01

const region_bit = 5
const shard_bit = 5
const seq_bit = 12

const region_max* = 1 shl region_bit - 1
const shard_max* = 1 shl shard_bit - 1
const seq_max* = 1 shl seq_bit - 1

const shard_offset = seq_bit
const region_offset = shard_bit + shard_offset
const ts_offset = region_bit + region_offset

type SnowflakeId* = object
  ts*: int64
  region_id*: uint8
  shard_id*: uint8
  seq_id*: uint16

var last_ts: int64 = -1
var seq_id: uint16 = 0

proc newSnowflakeId*(time: Time): SnowflakeId =
  let ts = int64(time.toUnixFloat * 1e3)

  result.ts = ts - start_time
  result.region_id = region_id
  result.shard_id = shard_id

  if ts > last_ts:
    last_ts = ts
    seq_id = 0
  elif seq_id == seq_max:
    result.ts += 1
    last_ts += 1
    seq_id = 0
  else:
    seq_id += 1

  result.seq_id = seq_id

proc `$`*(snowflake: SnowflakeId): string =
  let id: int64 = snowflake.ts shl ts_offset +
                  int64(snowflake.region_id) shl region_offset +
                  int64(snowflake.shard_id) shl shard_offset +
                  int64(snowflake.seq_id)
  return $id
