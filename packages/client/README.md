### Postponed

- server-side queries in idiomatic TypeScript

### Unresolved

- persistence
- code-splitting

### Resolved

- cached vs uncached
  - Ref-based objects are cached

- A "partial" is created when mapping a ref from a query or RPC result.
  Partials of the same ref are merged into a single observable object.
  When a ref is materialized, the partial is graduated into a full
  instance of the ref's class.

- Collections
  ```ts
  todos.get(ref) // => Query<Todo>
  todos.cache.get(ref) // => Todo | null

  todos.sortBy('date') // => Query<Todo[]>
  todos.query({ done: true }) // => Query<Todo[]>
  todos.query(todo => todo.assigned.contains(todo.author)) // => Query<Todo[]>
  ```

- Queries
  ```ts
  // "todos" is a local collection of Todo records
  import { todos } from 'todos'

  // Create a query whose results are cached in the "todos" collection.
  // Queries are thenables which can manipulate results before awaiting them.
  const completed = todos.query({ done: true })

  // Get all matching refs
  await completed

  // Get all matching records
  await completed.map(todo => todo.get())

  // Select specific fields
  await completed.map(todo => todo.pick('id', 'text'))

  // Omit specific fields
  await completed.map(todo => todo.omit('notes'))

  // Sculpt the results
  await completed.map(todo => ({
    ...todo,
    author: {
      ...todo.author.pick('name', 'avatar'),
      // Sub-queries (RPC calls are also supported)
      todos: todos.query({ author: todo.author }),
    },
    assigned: todo.assigned.map(user => user.pick('name', 'avatar')),
  }))

  // Filter the results
  const selfAssigned = await completed.filter(todo => {
    return todo.assigned.contains(todo.author)
  })

  // Paginated query
  await completed.paginate({ after, count: 10 })
  ```

- RPC result mapping
  (same as query mapping, sans pagination)
