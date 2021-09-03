import {
  JSDocableNode,
  NameableNode,
  NamedNode,
  Node,
  PropertyNamedNode,
  TypeReferenceNode,
} from 'ts-morph'
import path from 'path'
import fs from 'fs'

export const mergeIntoSet = <T>(
  into: Set<T>,
  from: { forEach(cb: (value: T) => void): void }
) => from.forEach(value => into.add(value))

export const printImport = ([source, vars]: [string, string[]]) =>
  `import ` +
  (vars.length ? `{ ${vars.join(', ')} } from ` : ``) +
  `"${source}"`

export function printJSDocs(node: JSDocableNode) {
  const [docs] = node.getJsDocs()
  return docs
    ? `/**${docs.getInnerText().replace(/(^|\n)/g, '\n * ')}\n */\n`
    : ``
}

export function findReferencedTypes(node: Node, types: Set<Node>) {
  if (Node.isTypeReferenceNode(node)) {
    resolveTypeReference(node, types)
  } else {
    node.forEachDescendant(node => {
      if (Node.isTypeReferenceNode(node)) {
        resolveTypeReference(node, types)
      }
    })
    // Implicit return type
    if (Node.isReturnTypedNode(node) && !node.getReturnTypeNode()) {
      node.getReturnType()
    }
  }
}

function resolveTypeReference(node: TypeReferenceNode, types: Set<Node>) {
  for (const def of getDefinitions(node.getTypeName())) {
    const decl = def.getDeclarationNode()
    if (decl) {
      types.add(decl)
    }
  }
}

export function getDefinitions(node: Node) {
  return node.getProject().getLanguageService().getDefinitions(node)
}

export function isNamedNode(
  node: Node
): node is Node & (NamedNode | NameableNode | PropertyNamedNode) {
  return (
    Node.isNameableNode(node) ||
    Node.isNamedNode(node) ||
    Node.isPropertyNamedNode(node)
  )
}

export function getNameNode(node: Node) {
  return isNamedNode(node) ? node.getNameNode() : undefined
}
