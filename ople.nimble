# Package
version       = "0.1.0"
author        = "Alec Larson"
description   = "Ople database"
license       = "See LICENSE"
bin           = @["ople"]
binDir        = "dist"

# Dependencies
requires "nim >= 1.4.8"
requires "classes >= 0.2.0"
requires "nimdbx >= 0.4.1"
requires "cbor >= 0.6.0"
requires "napibindings >= 0.1.0"
