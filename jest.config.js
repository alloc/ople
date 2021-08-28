module.exports = {
  collectCoverageFrom: ['packages/**/*.ts'],
  testEnvironment: 'node',
  transform: {
    '.(ts|tsx)': 'esbuild-jest',
  },
}
