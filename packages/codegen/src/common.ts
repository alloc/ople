import {
  JSDocableNode,
  NameableNode,
  NamedNode,
  Node,
  PropertyNamedNode,
  SourceFile,
  Type,
  TypeReferenceNode,
} from 'ts-morph'

export const isExternalModule = (file: SourceFile, root: string) => {
  const filePath = file.getFilePath()
  return !filePath.startsWith(root + '/') || filePath.includes('/node_modules/')
}

export const mergeIntoSet = <T>(
  into: Set<T>,
  from: { forEach(cb: (value: T) => void): void }
) => from.forEach(value => into.add(value))

export const printImport = ([source, vars]: [string, string[]]) =>
  `import ` +
  (vars.length ? `{ ${vars.join(', ')} } from ` : ``) +
  `"${source}"`

export function printJSDocs(node: Node) {
  if (Node.isJSDocableNode(node)) {
    const [docs] = node.getJsDocs()
    return docs
      ? `/**${docs.getInnerText().replace(/(^|\n)/g, '\n * ')}\n */\n`
      : ``
  }
  return ``
}

export function findReferencedTypes(node: Node | Type, types: Set<Node>) {
  if (node instanceof Type) {
    if (node.isTuple()) {
      for (const element of node.getTupleElements()) {
        findReferencedTypes(element, types)
      }
    } else if (node.isUnion()) {
      for (const type of node.getUnionTypes()) {
        findReferencedTypes(type, types)
      }
    } else if (node.isIntersection()) {
      for (const type of node.getIntersectionTypes()) {
        findReferencedTypes(type, types)
      }
    } else {
      for (const type of node.getTypeArguments()) {
        findReferencedTypes(type, types)
      }
      let symbol = node.getSymbol()
      if (symbol) {
        for (const decl of symbol.getDeclarations()) {
          types.add(decl)
        }
      } else {
        symbol = node.getAliasSymbol()
        if (symbol) {
          throw Error(`Not implemented`)
        } else {
          for (const prop of node.getProperties()) {
            for (const decl of prop.getDeclarations()) {
              findReferencedTypes(decl, types)
            }
          }
        }
      }
    }
  } else if (Node.isTypeReferenceNode(node)) {
    resolveTypeReference(node, types)
  } else {
    node.forEachDescendant(node => {
      if (Node.isTypeReferenceNode(node)) {
        resolveTypeReference(node, types)
      }
    })
    // Implicit return type
    if (Node.isReturnTypedNode(node) && !node.getReturnTypeNode()) {
      findReferencedTypes(node.getReturnType(), types)
    }
  }
}

function resolveTypeReference(node: TypeReferenceNode, types: Set<Node>) {
  const typeName = node.getTypeName()
  for (const def of getDefinitions(typeName)) {
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
