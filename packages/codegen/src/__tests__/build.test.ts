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
  const compileFile = (code: string) => compileQueries(makeFile(code))

  test('export function', () => {
    expect(compileFile(`export function foo() {}`)).toMatchSnapshot()
  })

  test('unknown identifier', () => {
    const file = makeFile(`
      export function foo() {
        return lol
      }
    `)

    expect(() => compileQueries(file)).toThrowErrorMatchingSnapshot()
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

  describe('if blocks', () => {
    test('empty then', () => {
      const file = makeFile(`
        export function foo() {
          if (true) {}
        }
      `)

      expect(compileQueries(file)).toMatchSnapshot()
    })

    test('then return', () => {
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

    test('else return', () => {
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

    test('nested return', () => {
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

    test('non-boolean condition', () => {
      const file = makeFile(`
        export function foo(arg: string) {
          if (arg) {}
        }
      `)

      expect(compileQueries(file)).toMatchSnapshot()
    })
  })

  describe('operators', () => {
    const compileExpression = (expr: string) =>
      compileFile(`
        export function foo(a: number, b: number) {
          return ${expr}
        }
      `)

    test('algebraic operators', () => {
      expect([
        compileExpression('a + b'),
        compileExpression('a - b'),
        compileExpression('a * b'),
        compileExpression('a / b'),
        compileExpression('a % b'),
      ]).toMatchSnapshot()
    })

    test('bitwise operators', () => {
      expect([
        compileExpression('a & b'),
        compileExpression('a | b'),
        compileExpression('a ^ b'),
        compileExpression('~a'),
      ]).toMatchSnapshot()
    })

    test('comparison operators', () => {
      expect([
        compileExpression('a > b'),
        compileExpression('a >= b'),
        compileExpression('a < b'),
        compileExpression('a <= b'),
        compileExpression('a == b'),
      ]).toMatchSnapshot()
    })

    test('not operator', () => {
      expect([
        compileExpression('!a'),
        compileExpression('!!a'),
      ]).toMatchInlineSnapshot(`null`)
    })

    test('strict equals', () => {
      expect(() => compileExpression('a === b')).toThrowErrorMatchingSnapshot()
    })
  })

  describe('strings', () => {
    test('length', () => {
      const result = compileFile(`
        export function foo(arg: string) {
          return arg.length
        }
      `)

      expect(result).toMatchSnapshot()
    })
  })

  describe('objects', () => {
    test('single property', () => {
      const result = compileFile(`
        export function foo(obj: {a: any}) {
          return obj.a
        }
      `)

      expect(result).toMatchSnapshot()
    })

    test('nested property', () => {
      const result = compileFile(`
        export function foo(obj: {a: {b:any}}) {
          return obj.a.b
        }
      `)

      expect(result).toMatchSnapshot()
    })
  })

  describe('arrays', () => {
    test('length', () => {
      const result = compileFile(`
        export function foo(arg: any[]) {
          return arg.length
        }
      `)

      expect(result).toMatchSnapshot()
    })
  })

  describe('documents', () => {})

  describe('collections', () => {})

  describe('stdlib', () => {
    test('toArray', () => {})
    test('isArray', () => {})
  })
})
