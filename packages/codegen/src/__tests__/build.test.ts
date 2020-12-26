import dedent from 'dedent'
import { Project } from 'ts-morph'
import { compileQueries } from '../build'

const project = new Project()
const makeFile = (code: string) =>
  project.createSourceFile(
    project.getSourceFiles().length + '.ts',
    dedent(code)
  )

afterEach(() => {
  project.getSourceFiles().forEach(file => project.removeSourceFile(file))
})

describe('queries', () => {
  test('export function', () => {
    const file = makeFile(`
      export function foo() {}
    `)

    expect(compileQueries(file)).toMatchSnapshot()
  })

  test('literal values', () => {
    const file = makeFile(`
      export function foo() {
        true
        false
        'string'
        null
        123
      }
    `)

    expect(compileQueries(file)).toMatchSnapshot()
  })

  test('declare variable', () => {
    const file = makeFile(`
      export function foo() {
        let a = 1
      }
    `)

    expect(compileQueries(file)).toMatchSnapshot()
  })

  test('early return', () => {
    const file = makeFile(`
      export function foo() {
        return 1
        return 2
      }
    `)

    expect(compileQueries(file)).toMatchSnapshot()
  })

  test('empty if block', () => {
    const file = makeFile(`
      export function foo() {
        if (true) {}
      }
    `)

    expect(compileQueries(file)).toMatchSnapshot()
  })

  test('if then return', () => {
    const file = makeFile(`
      export function foo() {
        if (true) {
          return 1
        }
        return 2
      }
    `)

    expect(compileQueries(file)).toMatchSnapshot()
  })

  test('if else return', () => {
    const file = makeFile(`
      export function foo() {
        if (true) {}
        else {
          return 1
        }
        return 2
      }
    `)

    expect(compileQueries(file)).toMatchSnapshot()
  })

  test('if nested return', () => {
    const file = makeFile(`
      export function foo(doc: any) {
        if (true) {
          if (true) {
            return 1
          }
          doc.data.foo = 1
        }
        return 2
      }
    `)

    expect(compileQueries(file)).toMatchInlineSnapshot(`null`)
  })
})
