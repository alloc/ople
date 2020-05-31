module.exports = {
  preset: 'ts-jest',
  collectCoverageFrom: ['src/**/*.ts'],
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['packages'],
  globals: {
    'ts-jest': {
      diagnostics: false,
      packageJson: 'package.json',
    },
  },
}
