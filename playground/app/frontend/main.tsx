import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Box } from '@alloc/ui-box'

function App() {
  return (
    <Box>
      <Box
        is="button"
        type="button"
        onClick={async () => alert(await backend.helloWorld())}>
        Hello World
      </Box>
    </Box>
  )
}

ReactDOM.render(<App />, document.getElementById('root'))
