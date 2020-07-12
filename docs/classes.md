### Classes

There are two ways to declare an `Ople` subclass.

Pick whichever you prefer!

&nbsp;

#### `createClass`

Classes made by `createClass` meet the following criteria:

- extends the `Ople` class for event emitting and disposable effects
- requires the `new` keyword to be constructed
- can be extended

```ts
import {createClass, auto} from 'ople'

// Declare your props in TodoProps
interface TodoProps {
  content: string
}

// Declare your state and methods in TodoState
interface TodoState {
  id: string
  done: boolean
  content: string
}

// Declare your events in TodoEvents
interface TodoEvents {
  complete(): void
}

let nextId = 1

export const Todo = createClass<TodoState, TodoEvents, [TodoProps]>(
  'Todo',
  props => (todo, set, emit) => {
    set(props)
    set({
      id: nextId++,
      done: false,
    })
    auto(() =>
      todo.done && emit('complete')
    )
  }
)

// The type for `Todo` is declared like so:
import {ReadonlyOpleObject} from 'ople'
export interface Todo extends ReadonlyOpleObject<TodoState, TodoEvents> {}
```

&nbsp;

#### `extends Ople`

The `Ople` class can be extended by any class. This makes your class compatible with
Ople mixins, and it can even emit its own events.

The `initOple` function lets your class create reactions and event listeners with
automatic disposal. If you create an Ople object inside `initOple`'s callback,
it will be attached to the Ople context, which means the attached Ople object will
have its `dispose` method called when the Ople context is disposed.

```ts
import {Ople, initOple, auto} from 'ople'

// Declare your props in TodoProps
interface TodoProps {
  content: string
}

// Declare your events in TodoEvents
interface TodoEvents {
  complete(): void
}

let nextId = 1

class Todo extends Ople<TodoEvents> {
  id = nextId++
  done = false
  content!: string // The `!` is required to avoid `this.content = props.content` syntax

  constructor(props: TodoProps) {
    super()

    // // This line is not needed, because of our `set(props)` call
    // this.content = props.content

    // Use the `initOple` function to set the Ople context, which
    // handles the disposal of any listeners or reactions created
    // inside the callback.
    initOple(this, (self, set, emit) => {
      // Merge the `props` object into `this`
      set(props)

      // Create a reactive callback
      auto(() => self.done && emit('complete'))

      // Attach listeners to `self` (or any other Ople object)
      self.on({
        complete() {
          console.log('Todo completed:', self)
        },
      })
    })
  }

  toggleDone() {
    this.done = !this.done
  }
}

const todo = new Todo({ content: 'Hello world' })

// BAD: Ople objects are readonly outside their initializer.
todo.done = true

// GOOD: Exposing a method is best practice.
todo.toggleDone()
```
