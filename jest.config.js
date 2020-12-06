module.exports = {
  collectCoverageFrom: ['packages/**/*.ts'],
  testEnvironment: 'node',
  transform: {
    '.(js|jsx|ts|tsx)': '@sucrase/jest-plugin',
  },
}
