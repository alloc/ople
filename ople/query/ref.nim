import times

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
  ts: int64
  region_id: uint8
  shard_id: uint8
  seq_id: uint16

proc newSnowflakeId*(ts: int64): SnowflakeId =
  SnowflakeId(ts: getTime())

proc `$`*(snowflake: SnowflakeId): string =
