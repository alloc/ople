import { Node, SourceFile } from 'ts-morph'

/** `SourceLocation` from `@babel/code-frame` */
export interface SourceLocation {
  start: { line: number; column?: number | undefined }
  end?: { line: number; column?: number | undefined } | undefined
}

export interface Warning {
  message: string
  location: SourceLocation
  file: SourceFile
}

export const warningsByFile = new Map<SourceFile, Warning[]>()

export function warn(node: Node, message: string) {
  const startLine = node.getStartLineNumber()
  const endLine = node.getEndLineNumber()
  const location: SourceLocation = {
    start: {
      line: startLine,
      column:
        startLine === endLine
          ? 1 + (node.getStart() - node.getStartLinePos())
          : undefined,
    },
    end: startLine !== endLine ? { line: endLine } : undefined,
  }
  const file = node.getSourceFile()
  let warnings = warningsByFile.get(file)
  if (!warnings) {
    warnings = []
    warningsByFile.set(file, warnings)
  }
  warnings.push({
    message,
    location,
    file,
  })
}
