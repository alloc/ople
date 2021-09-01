import {
  FunctionExpression,
  Identifier,
  MethodDeclaration,
  Node,
  PropertyAssignment,
  ShorthandPropertyAssignment,
  Signature,
  SourceFile,
} from 'ts-morph'
import { findReferencedTypes } from '../common'
import { warn } from '../warnings'

export type OpleFunction = {
  name: string
  signatures: Signature[]
  referencedTypes: Set<Node>
  node: Node
  file: SourceFile
}

export function parseFunctions(file: SourceFile) {
  const functions: OpleFunction[] = []
  for (const node of findExposedFunctions(file)) {
    const [name, signatures] = extractSignatures(node)
    if (name)
      functions.push({
        name,
        signatures,
        referencedTypes: getReferencedTypes(signatures),
        node,
        file,
      })
  }
  return functions
}

function getReferencedTypes(signs: Signature[]) {
  const referencedTypes = new Set<Node>()
  signs.forEach(sign => {
    findReferencedTypes(sign.getDeclaration(), referencedTypes)
  })
  return referencedTypes
}

export type ExposedFunction =
  | Identifier
  | FunctionExpression
  | MethodDeclaration
  | PropertyAssignment
  | ShorthandPropertyAssignment

export function findExposedFunctions(source: SourceFile) {
  const exposedFunctions: ExposedFunction[] = []
  source.forEachChild(stmt => {
    if (!Node.isExpressionStatement(stmt)) {
      return
    }
    const callNode = stmt.getExpression()
    if (!Node.isCallExpression(callNode)) {
      return
    }
    const calleeNode = callNode.getExpression()
    if (Node.isIdentifier(calleeNode)) {
      const callee = calleeNode.getText()
      if (callee == 'exposeFunction') {
        const [arg] = callNode.getArguments()
        if (Node.isIdentifier(arg)) {
          exposedFunctions.push(arg)
        } else if (Node.isFunctionExpression(arg)) {
          const nameNode = arg.getNameNode()
          if (nameNode) {
            exposedFunctions.push(arg)
          } else {
            warn(arg, `Exposed function must be named`)
          }
        } else {
          warn(arg, `Unsupported node type: ${arg.getKindName()}`)
        }
      } else if (callee == 'exposeFunctions') {
        const [arg] = callNode.getArguments()
        if (Node.isObjectLiteralExpression(arg)) {
          for (const prop of arg.getProperties()) {
            if (
              Node.isMethodDeclaration(prop) ||
              Node.isPropertyAssignment(prop) ||
              Node.isShorthandPropertyAssignment(prop)
            ) {
              exposedFunctions.push(prop)
            } else {
              warn(prop, `Unsupported node type: ${prop.getKindName()}`)
            }
          }
        } else {
          warn(arg, `Unsupported node type: ${arg.getKindName()}`)
        }
      }
    }
  })
  return exposedFunctions
}

export type SignatureMap = Record<string, Signature[]>

export function extractSignatures(node: ExposedFunction) {
  let name: string | undefined
  let signatures: Signature[] | undefined
  if (Node.isIdentifier(node)) {
    name = node.getText()
    signatures = findSignatures(node)
  } else if (
    Node.isNamedNode(node) ||
    Node.isNameableNode(node) ||
    Node.isPropertyNamedNode(node)
  ) {
    name = node.getName()
    if (Node.isFunctionExpression(node)) {
      signatures = [node.getSignature()]
    } else if (Node.isShorthandPropertyAssignment(node)) {
      signatures = findSignatures(node.getNameNode())
    } else if (Node.isMethodDeclaration(node)) {
      signatures = [node.getSignature()]
    } else if (Node.isPropertyAssignment(node)) {
      const init = node.getInitializer()
      if (Node.isSignaturedDeclaration(init)) {
        signatures = [init.getSignature()]
      } else if (Node.isIdentifier(init)) {
        signatures = findSignatures(init)
      }
    }
  }
  if (name && signatures?.length) {
    return [name, signatures] as const
  }
  return []
}

function findSignatures(ident: Identifier) {
  const [node] = ident.getDefinitionNodes()
  if (!Node.isFunctionDeclaration(node)) {
    return []
  }
  const overloads = node.getOverloads()
  return overloads.length
    ? overloads.map(overload => overload.getSignature())
    : [node.getSignature()]
}
