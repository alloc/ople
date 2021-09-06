export function tokenize(text: string, splitPattern: RegExp) {
  splitPattern = copyRegExp(splitPattern, 'g')

  const tokens: string[] = []

  let match: RegExpExecArray | null
  let lastIndex = 0
  while ((match = splitPattern.exec(text))) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index))
    }
    tokens.push(match[0])
    lastIndex = splitPattern.lastIndex
  }

  if (lastIndex == 0 || text.length > lastIndex) {
    tokens.push(text.slice(lastIndex))
  }

  return tokens
}

function copyRegExp(re: RegExp, addedFlags: string) {
  const flags = new Set(re.flags.split(''))
  addedFlags.split('').forEach(flag => flags.add(flag))
  return new RegExp(re.source, Array.from(flags).join(''))
}
