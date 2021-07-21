import { OpleService } from '@ople/backend'

const app = new OpleService({
  path: '/',
  // faunadb: { key: '' },
})

app.use({
  helloWorld() {
    return 'Hello world'
  },
})
