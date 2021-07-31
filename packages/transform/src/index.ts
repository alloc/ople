import type {
  PluginObj as BabelPlugin,
  types as t,
  NodePath,
} from '@babel/core'
import createDebug from 'debug'

const debug = createDebug('ople-transform')

export function babelOpleClient(
  babel: typeof import('@babel/core'),
  options: any
): BabelPlugin {
  const { types: t } = babel
  const { importSource = '@ople/client' } = options
  return {
    name: '@ople/transform',
    visitor: {
      Program(path) {
        const opleImports: { [name: string]: string } = {}

        let lastOpleImport: t.ImportDeclaration | undefined
        path.node.body.forEach(stmt => {
          if (stmt.type !== 'ImportDeclaration') return
          if (stmt.source.value !== importSource) return
          lastOpleImport = stmt
          stmt.specifiers.forEach(spec => {
            if (spec.type === 'ImportSpecifier') {
              const value = t.isIdentifier(spec.imported)
                ? spec.imported.name
                : spec.imported.value

              opleImports[spec.local.name] = value
              debug(`"${value}" was imported from "${importSource}"`)
            } else {
              debug(`[!] ${spec.type} not supported`)
            }
          })
        })

        if (!lastOpleImport) {
          debug(`[!] "${importSource}" was never imported`)
          return
        }

        if (!opleImports.prepare) {
          debug('Inserting "prepare" import')
          const prepareIdent = t.identifier('prepare')
          lastOpleImport.specifiers.push(
            t.importSpecifier(prepareIdent, prepareIdent)
          )
        }

        const prepareCalls: [className: string, impl: t.BlockStatement][] = []

        path.traverse({
          ClassDeclaration(path) {
            const clas = path.node
            const className = clas.id.name
            const { superClass } = path.node
            if (superClass && t.isIdentifier(superClass)) {
              const opleType = opleImports[superClass.name]
              if (opleType === 'Ople' || opleType === 'OpleRecord') {
                debug(`"${className}" extends ${opleType}`)

                const prepareCall = t.expressionStatement(
                  t.callExpression(t.identifier('prepare'), [
                    t.identifier('this'),
                    t.identifier(className),
                  ])
                )

                let hasConstructor = false
                let prepareImpl: t.ClassMethod | undefined
                let prepareIndex = -1

                clas.body.body.forEach((node, i) => {
                  if (node.type === 'ClassMethod' && t.isIdentifier(node.key)) {
                    const method = node.key.name
                    if (method === 'constructor') {
                      hasConstructor = true
                      node.body.body.push(prepareCall)
                    } else if (method === 'prepare') {
                      prepareImpl = node
                      prepareIndex = i
                    }
                  }
                })

                if (prepareImpl) {
                  const body = path.get('body').get('body')
                  const method = body[prepareIndex].node as t.ClassMethod
                  prepareCalls.push([className, method.body])

                  clas.body.body.splice(prepareIndex, 1)
                  if (!hasConstructor)
                    clas.body.body.unshift(
                      t.classMethod(
                        'constructor',
                        t.identifier('constructor'),
                        [],
                        t.blockStatement([
                          t.expressionStatement(
                            t.callExpression(t.identifier('super'), [])
                          ),
                          prepareCall,
                        ])
                      )
                    )
                }
              }
            }
          },
        })

        prepareCalls.forEach(([className, impl]) => {
          // Copy the `prepare` method into an arrow function that is passed
          // to the `prepare` export.
          path.node.body.push(
            t.expressionStatement(
              t.callExpression(t.identifier('prepare'), [
                t.identifier(className),
                t.functionExpression(null, [], impl),
              ])
            )
          )
        })
      },
    },
  }
}
