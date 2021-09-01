import type {
  BabelFile,
  PluginObj as BabelPlugin,
  Node as BabelNode,
  types as t,
} from '@babel/core'

type Node = {
  getPos(): number
}

type Signature = {
  getDeclaration(): Node
}

type OpleFunction = {
  name: string
  signatures: Signature[]
  file: {
    getFilePath(): string
  }
}

type Options = {
  getOpleFunction: (name: string) => OpleFunction | undefined
}

export function babelOpleFunctions(
  babel: typeof import('@babel/core'),
  { getOpleFunction }: Options
): BabelPlugin {
  const { types: t } = babel
  const magicFns = ['emit', 'subscribe', 'unsubscribe']

  return {
    name: '@ople/transform/functions',
    visitor: {
      CallExpression(path, { file }) {
        const { callee } = path.node
        if (t.isIdentifier(callee) && magicFns.includes(callee.name)) {
          injectCaller(path.node.arguments)
        }
      },
      ObjectMethod(path, { file }) {
        if (isOpleFunction(path.node, file)) {
          injectCaller(path.node.params)
        }
      },
      FunctionExpression(path, { file }) {
        if (isOpleFunction(path.node, file)) {
          injectCaller(path.node.params)
        }
      },
      FunctionDeclaration(path, { file }) {
        if (isOpleFunction(path.node, file)) {
          injectCaller(path.node.params)
        }
      },
    },
  }

  type FunctionNode =
    | t.ObjectMethod
    | t.FunctionExpression
    | t.FunctionDeclaration

  function isOpleFunction(node: FunctionNode, file: BabelFile) {
    const ident = t.isObjectMethod(node) ? node.key : node.id
    if (!t.isIdentifier(ident)) {
      return false
    }
    const fun = getOpleFunction(ident.name)
    if (fun && file.opts.filename == fun.file.getFilePath()) {
      return fun.signatures.some(sig => {
        const decl = sig.getDeclaration()
        return decl.getPos() == node.start
      })
    }
  }

  function injectCaller(nodes: BabelNode[]) {
    nodes.splice(0, 0, t.identifier('caller'))
  }
}
