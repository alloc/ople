# Synchronous mode

In "sync mode", all interactions with the database occur immediately, instead of being batched and serialized into a single query. This is extremely useful for debugging, but its performance implications make it a bad idea for production. It's also incompatible with the FaunaDB backend.

### Code transformation

No code transformation is necessary in sync mode.

### Math operations

The built-in `Math` namespace can be used on numbers within `read` and `write` queries. In async mode, these calls will be transformed.
