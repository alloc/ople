# Polling

For cases where event streaming via websocket is cost-prohibitive, HTTP polling is the next best option.

You can enable HTTP polling on individual `Record` and `Cursor` objects.

```ts
import { startPolling, endPolling } from 'ople'

// Check the record every 30 seconds.
startPolling(record, 30)

// Manual pulls reset the polling timer.
record.pull()

// Stop polling for changes to this record.
endPolling(record)
```

### Disposal

When a `Record` or `Cursor` with polling enabled has its `dispose` method called, polling will stop automatically.
