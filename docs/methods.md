# Backend Methods

"Backend methods" are declared by the backend config.

```ts
export function add(...args: number[]) {
  return args.reduce((sum, n) => sum + n, 0)
}
```

They are called by the client.

```ts
import api from './api'

api.add(1, 1) // => Promise<number>
```

### Identify the caller

Within a backend method, the `getIdentity` function returns a `Ref` that represents the authenticated user. This is most useful when working with a key-value cache, and also for collecting user-based analytics on the backend.

The `expectIdentity` function bails out if no user is authenticated. This is useful in preventing unnecessary database communication.
