export function now() {
  const [secs, nano] = process.hrtime()
  return secs * 1000000000 + nano
}
