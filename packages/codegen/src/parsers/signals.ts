import endent from 'endent'
import { Node, SourceFile } from 'ts-morph'
import { findReferencedTypes } from '../common'
import { warn } from '../warnings'

export type OpleSignal = {
  name: string
  signature: string
  referencedTypes: Set<Node>
  node: Node
}

export function parseSignals(source: SourceFile) {
  const signalsNode = source.forEachChild(
    node =>
      Node.isInterfaceDeclaration(node) && node.getName() === 'Signals' && node
  )
  const signals: OpleSignal[] = []
  if (signalsNode && signalsNode.isExported()) {
    for (const member of signalsNode.getMembers()) {
      if (!Node.isMethodSignature(member)) {
        warn(member, `Expected a method, but got a ` + member.getKindName())
        continue
      }

      const name = member.getName()
      const params = member.getParameters()
      const referencedTypes = new Set<Node>()

      params.forEach(node => {
        findReferencedTypes(node, referencedTypes)
      })

      const paramsText = params.map(param => param.getText())
      const firstParamType = params[0]?.getTypeNode()
      const targetType =
        firstParamType &&
        firstParamType.getText().match(/^OpleRef(?:|<(.+?)>)$/)?.[1]

      const [docs] = member.getJsDocs()
      const description = docs
        ? `/**${docs.getInnerText().replace(/(^|\n)/g, '\n * ')}\n */\n`
        : ``

      signals.push({
        name,
        signature:
          description +
          name +
          `(handler: (${paramsText.join(
            ', '
          )}) => boolean | void): OpleListener` +
          (targetType
            ? `\n` +
              name +
              `(target: ${targetType}, handler: (${paramsText
                .slice(1)
                .join(', ')}) => boolean | void): OpleListener`
            : ``),
        referencedTypes,
        node: member,
      })
    }
  } else {
    warn(signalsNode || source, `You must export an interface named "Signals"`)
  }
  return signals
}
