module.exports = {
  root: true,
  extends: '@react-native',
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
    'jest/globals': true,
    'node': true
  },
  plugins: ['jest'],
  overrides: [
    {
      files: ['tests/**/*.js', '**/*.test.js', '**/*.test.ts'],
      env: {
        jest: true,
        node: true
      },
      globals: {
        'Buffer': 'readonly',
        'fail': 'readonly'
      },
      rules: {
        '@typescript-eslint/no-unused-vars': 'warn',
        'no-unused-vars': 'warn'
      }
    }
  ]
};
