# ople

[![npm](https://img.shields.io/npm/v/ople.svg)](https://www.npmjs.com/package/ople)
[![Build status](https://travis-ci.org/alloc/ople.svg?branch=master)](https://travis-ci.org/alloc/ople)
[![codecov](https://codecov.io/gh/alloc/ople/branch/master/graph/badge.svg)](https://codecov.io/gh/alloc/ople)
[![Bundle size](https://badgen.net/bundlephobia/min/ople)](https://bundlephobia.com/result?p=ople)
[![Code style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://paypal.me/alecdotbiz)

Event-driven, observable data flow for React 💥👀

**Features**

- Transparent observability for seamless, reactive data flow
- Automatic disposal of event listeners and `auto` reactions
- Compatible with all [`wana`](https://github.com/alloc/wana) functions
- Mixins for sharable behavior (inspired by React hooks)
- Strict type safety with TypeScript
- Objects are readonly outside their initializer
- Objects have built-in event emitting
- Highly minifiable code
- Concise, distilled API

&nbsp;

## Usage

The `createOple` function constructs an Ople object, which is both observable
and readonly to React components. Expose methods for React components to call,
and expose events for React components to subscribe to.

```tsx
import {createOple, auto} from 'ople'

// Pass an initializer function to receive a state object,
// a set function, and an emit function.
const state = createOple((self, set, emit) => {
  // The state is mutable.
  self.a = 1

  // The state is observable.
  auto(() => {
    console.log('a:', self.a)
  })

  // The set function is a shortcut for `Object.assign(self, {...})`
  set({ b: 1, c: 1 })

  // The set function converts every getter into an observable getter (unless a setter exists).
  set({
    get sum() {
      return self.a + self.b + self.c
    }
  })
  auto(() => {
    console.log('sum:', self.sum)
  })

  // The set function is the recommended way of declaring methods.
  set({
    // Methods declared with `set` are wrapped to disable implicit observation
    // and to set the Ople context until the method returns.
    add(key: string, n: number) {
      self[key] += n

      // The emit function is a shortcut for `self.emit(...)`
      emit('add', key, n)
    }
  })

  // Subscribe to your own events or the events of another Ople object.
  // Your listeners are removed when the built-in `dispose` method is called.
  self.on({
    add(key, n) {
      console.log('add:', key, n)
    }
  })
})

// The state is observable outside the initializer, too.
auto(() => {
  console.log('b:', state.b)
})

state.add('b', 2)

// Clean up any side effects.
state.dispose()
```

&nbsp;

## Classes

If you like creating objects with `new` syntax or you prefer storing your methods
on a prototype for efficiency, you can create an `Ople` subclass. For more info,
see the [Classes](./docs/classes.md) page.

&nbsp;

## Mixins

As an alternative to classes (which limit you to a single superclass), you can
use "mixin functions" to share behavior between your Ople objects. Mixins should
be very familiar to anyone who uses React hooks. Just remember, mixins are **NOT**
subject to the same rules as React hooks. For example, mixins can be called from
within `if` blocks. The **only rule** of mixins is that you should only ever call
them from within an Ople context (eg: inside a `createOple` initializer).

For more info, see the [Mixins](./docs/mixins.md) page.

