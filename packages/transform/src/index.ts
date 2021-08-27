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

        const prepareCalls: [
          className: string,
          impl: t.BlockStatement | null
        ][] = []

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

                // Always pass OpleRecord types to the `prepare` export
                // so they can be used
                if (prepareImpl || opleType === 'OpleRecord') {
                  const body = path.get('body').get('body')
                  prepareCalls.push([
                    className,
                    prepareImpl
                      ? (body[prepareIndex].node as t.ClassMethod).body
                      : null,
                  ])
                }

                if (prepareImpl) {
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

        if (prepareCalls.length) {
          prepareCalls.forEach(([className, impl]) => {
            const args: any[] = [t.identifier(className)]
            if (impl) {
              args.push(t.functionExpression(null, [], impl))
            }
            // Copy the `prepare` method into a function that is passed
            // to the `prepare` export.
            path.node.body.push(
              t.expressionStatement(
                t.callExpression(t.identifier('prepare'), args)
              )
            )
          })
          if (!opleImports.prepare) {
            debug('Inserting "prepare" import')
            const prepareIdent = t.identifier('prepare')
            lastOpleImport.specifiers.push(
              t.importSpecifier(prepareIdent, prepareIdent)
            )
          }
        }
      },
    },
  }
}
