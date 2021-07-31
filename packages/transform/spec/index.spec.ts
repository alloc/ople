import * as babel from '@babel/core'
import endent from 'endent'
import { babelOpleClient } from '../src'

function transform(code: string) {
  return babel.transformSync(endent(code as any), {
    plugins: [require('@babel/plugin-syntax-typescript'), babelOpleClient],
    sourceMaps: 'inline',
  })?.code
}

test('simple example', () => {
  const output = transform(`
    import { auto, Ople } from '@ople/client'

    class Foo extends Ople {
      constructor(readonly foo: number) {
        super()
      }
      prepare() {
        auto(() => {
          console.log('foo:', this.foo)
        })
      }
    }
  `)

  console.log(output)
  expect(output).toBe(null)
})
