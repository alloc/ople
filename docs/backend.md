```ts
const service = new OpleService({
  // Singleton mode
  dataProvider: new OpleDatabase(dataPath),
  // Serverless mode
  dataProvider: new FaunaProvider(credentials),
})

// Generate one bundle per route for serverless
service.generateRoutes()

// Handle an HTTP request
service.handle(req, res, next)

export const service.defineFunctions()
```
