module.exports = {
  extends: ['../../packages/config/eslint.config.js'],
  rules: {
    '@typescript-eslint/no-extraneous-class': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-empty': ['error', { allowEmptyCatch: true }],
  },
};
