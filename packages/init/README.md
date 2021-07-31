# @ople/init

Pollute the global namespace with functions used in `ople.init.js` modules.

```ts
import '@ople/init'

setEngine('faunadb')

openCollection('users')
```

## API reference

**Global functions**

- `setEngine`

- `openDatabase`

- `openCollection`

- `renameCollection`

- `dropCollection`

## Classes

### `Database`

Returned by `openDatabase`.

**Methods**

- `withIndex`  
  Declare an index that is _not_ tied to a single collection.

### `Collection`

Returned by `openCollection`.

**Methods**

- `withIndex`  
  Declare an index that is tied to a single collection.
