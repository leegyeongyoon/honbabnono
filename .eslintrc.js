module.exports = {
  root: true,
  ignorePatterns: [
    'node_modules/**',
    'dist/**',
    'coverage/**',
    'build/**',
    'admin/**',
    'ios/**',
    'android/**',
    'HonbabnonoExpo/**',
    '**/*.chunk.js',
    '**/*.bundle.js',
    '**/*.min.js',
    'webpack.config.js',
    'metro.config.js',
    'babel.config.js',
    'jest.config.js'
  ],
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': 'off',
    'no-undef': 'off'
  }
};