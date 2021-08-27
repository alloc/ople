import { Node, Project, TypeNode } from 'ts-morph'

export function parseCollections(project: Project, initPath: string) {
  const collections: Record<string, TypeNode | undefined> = {}
  const initFile = project.addSourceFileAtPath(initPath)
  initFile.forEachChild(node => {
    if (Node.isCallExpression(node)) {
      const calleeNode = node.getExpression()
      const [nameNode] = node.getArguments()
      if (!Node.isIdentifier(calleeNode)) {
        return
      }
      const callee = calleeNode.getText()
      if (callee == 'openCollection') {
        if (!Node.isStringLiteral(nameNode)) {
          throw Error(`"openCollection" call must receive a string literal`)
        }
        const name = nameNode.getLiteralValue()
        const [typeNode] = node.getTypeArguments()
        collections[name] = typeNode
      }
    }
  })
  return collections
}
