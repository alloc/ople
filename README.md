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

```
TODO: document the "createOple" function
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

