import { MethodSignature, Node, SourceFile } from 'ts-morph'
import { findReferencedTypes, printJSDocs } from '../common'
import { warn } from '../warnings'

export type OpleSignal = {
  name: string
  node: MethodSignature
  referencedTypes: Set<Node>
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
      const referencedTypes = new Set<Node>()

      for (const node of member.getParameters()) {
        findReferencedTypes(node, referencedTypes)
      }

      signals.push({
        name,
        node: member,
        referencedTypes,
      })
    }
  } else {
    warn(signalsNode || source, `You must export an interface named "Signals"`)
  }
  return signals
}
