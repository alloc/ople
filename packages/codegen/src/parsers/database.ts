import { ts, CallExpression, Node, SourceFile, TypeNode } from 'ts-morph'
import { warn } from '../warnings'

const reservedCollectionNames = ['events', 'set', 'self', 'documents', '_']

export type OpleCollection = {
  name: string
  type: TypeNode | null
  node: Node
}

export function parseCollections(source: SourceFile) {
  const collections: OpleCollection[] = []
  source.forEachChild(node => {
    if (!Node.isExpressionStatement(node)) return
    const call = node.getExpression()

    if (!Node.isCallExpression(call)) return
    const callee = getCallee(call)

    if (callee === 'openCollection') {
      const [nameNode] = call.getArguments()
      if (!Node.isStringLiteral(nameNode)) {
        return warn(call, `Collection name must be a string literal`)
      }
      const name = nameNode.getLiteralValue()
      if (reservedCollectionNames.includes(name)) {
        return warn(nameNode, `Collection name is reserved: "${name}"`)
      }
      const [documentType] = call.getTypeArguments()
      collections.push({
        name,
        type: documentType || null,
        node: call,
      })
    }
  })
  return collections
}

function getCallee(call: CallExpression) {
  const calleeNode = call.getExpression()
  if (Node.isIdentifier(calleeNode)) {
    return calleeNode.getText()
  }
}
