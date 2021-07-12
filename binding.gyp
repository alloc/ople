{
  "targets": [
    {
      "target_name": "ople",
      "cflags": [
        "-w",
        "-Wl,-rpath,/Users/aleclarson/.nimble/pkgs/nimdbx-0.4.1/libmdbx-dist"
      ],
      "include_dirs": [
        "/Users/aleclarson/.choosenim/toolchains/nim-1.4.8/lib",
        "/Users/aleclarson/.nimble/pkgs/nimdbx-0.4.1/libmdbx-dist"
      ],
      "linkflags": [
        "-ldl"
      ],
      "libraries": [
        "-lmdbx"
      ],
      "link_settings": {
        "libraries": [
          "-L$$HOME/.nimble/pkgs/nimdbx-0.4.1/libmdbx-dist",
          "-Wl,-rpath,$$HOME/.nimble/pkgs/nimdbx-0.4.1/libmdbx-dist"
        ]
      },
      "sources": [
        "nimcache/stdlib_assertions.nim.c",
        "nimcache/stdlib_dollars.nim.c",
        "nimcache/stdlib_formatfloat.nim.c",
        "nimcache/stdlib_io.nim.c",
        "nimcache/stdlib_system.nim.c",
        "nimcache/@m..@snapibindings@snapibindings@sutils.nim.c",
        "nimcache/@m..@snapibindings@snapibindings.nim.c",
        "nimcache/stdlib_parseutils.nim.c",
        "nimcache/stdlib_math.nim.c",
        "nimcache/stdlib_unicode.nim.c",
        "nimcache/stdlib_strutils.nim.c",
        "nimcache/stdlib_posix.nim.c",
        "nimcache/stdlib_options.nim.c",
        "nimcache/stdlib_times.nim.c",
        "nimcache/stdlib_os.nim.c",
        "nimcache/stdlib_hashes.nim.c",
        "nimcache/stdlib_tables.nim.c",
        "nimcache/@m..@s..@s.nimble@spkgs@snimterop-0.6.13@snimterop@sglobals.nim.c",
        "nimcache/stdlib_streams.nim.c",
        "nimcache/stdlib_lexbase.nim.c",
        "nimcache/stdlib_parsejson.nim.c",
        "nimcache/stdlib_json.nim.c",
        "nimcache/stdlib_cpuinfo.nim.c",
        "nimcache/@m..@s..@s.nimble@spkgs@snimdbx-0.4.1@snimdbx@sprivate@slibmdbx.nim.c",
        "nimcache/@m..@s..@s.nimble@spkgs@snimdbx-0.4.1@snimdbx@sprivate@svals.nim.c",
        "nimcache/@m..@s..@s.nimble@spkgs@snimdbx-0.4.1@snimdbx@sError.nim.c",
        "nimcache/@m..@s..@s.nimble@spkgs@snimdbx-0.4.1@snimdbx@sDatabase.nim.c",
        "nimcache/@m..@s..@s.nimble@spkgs@snimdbx-0.4.1@snimdbx@sData.nim.c",
        "nimcache/@m..@s..@s.nimble@spkgs@snimdbx-0.4.1@snimdbx@sCollection.nim.c",
        "nimcache/@m..@s..@s.nimble@spkgs@snimdbx-0.4.1@snimdbx@sTransaction.nim.c",
        "nimcache/@m..@s..@s.nimble@spkgs@snimdbx-0.4.1@snimdbx@sCRUD.nim.c",
        "nimcache/@moplepkg@sdata.nim.c",
        "nimcache/@moplepkg@sdata@sfrom_json.nim.c",
        "nimcache/@moplepkg@sdata@sto_json.nim.c",
        "nimcache/@moplepkg@squery.nim.c",
        "nimcache/@m..@s..@s.nimble@spkgs@scbor-0.6.0@scbor.nim.c",
        "nimcache/@moplepkg@sdata@sfrom_cbor.nim.c",
        "nimcache/@moplepkg@sdata@sto_cbor.nim.c",
        "nimcache/@moplepkg@sref.nim.c",
        "nimcache/@moplepkg@squery@scollection.nim.c",
        "nimcache/@moplepkg@squery@sdocument.nim.c",
        "nimcache/@moplepkg@sfunctions.nim.c",
        "nimcache/@moplepkg@seval.nim.c",
        "nimcache/@mople.nim.c"
      ]
    }
  ]
}