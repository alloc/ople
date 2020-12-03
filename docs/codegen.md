# Code generation

Ople generates a client library and a request handler for each API.

## Configuration

Use the `.ople.js` runtime configuration file to customize where the
generated code is placed in your project, as well as where your source
code is located.

### Sources

```js
import {configure} from '@ople/dev'

configure({
  client: {
    
  }
})
```
