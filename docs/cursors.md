# Cursors

Cursors manage pagination of optionally filtered and mapped collections.
They can also be watched for new matches.

Cursors are declared by the backend config.

```ts
import { cursors } from '@ople/config'
import type { Ref } from 'ople'
import db from './db'

cursors['my todos'] = (props: {}, caller) =>
  // TypeScript query is executed by the database.
  db.collection('todos').filter({ owner: caller })
```

Cursors are used by the client.

```ts
import api from './api'

// Cursor names have auto-completion.
const myTodos = api.cursor('my todos', {
  // Limit to 10 matches per request
  limit: 10,
  // Client-side filtering for created/deleted records
  match: todo => todo.owner == api.currentUser,
  // Extra data may be required
  props: {},
})

// Manual pagination
myTodos.loadPage(pageIndex)
myTodos.nextPage()

// Ask the server to send new matches
myTodos.autoSync()

// Perform array operations on loaded matches
myTodos.filter(todo => {})
myTodos.forEach(todo => {})
```

### Optimistic Updates

The `setProactiveEffect` function can define side effects that run when a backend method is called. Observable changes are reverted if the call fails.

```ts
import { setProactiveEffect } from 'ople'
import api from './api'

setProactiveEffect(api.deleteTodos, cursor => {
  cursor.forEach(todo => todo.dispose())
})

// The proactive effect runs when this call is made.
api.deleteTodos(cursor)
```

### Efficient List Rendering

Efficient rendering of lists can be achieved with the `<OpleList>` component, which is compatible with `Cursor` objects.

In the example below, when the `Cursor` loads new matches, they will be rendered immediately, and pre-existing matches won't _needlessly_ re-render. The same is true when a match is created or deleted by the client.

```tsx
import { OpleList } from '@ople/list'

<OpleList
  cursor={cursor}
  renderItem={item => <Item item={item}>}
/>
```
