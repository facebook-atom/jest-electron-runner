module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es6: true,
    node: true,
  },
  extends: 'eslint:recommended',
  parser: 'babel-eslint',
  plugins: ['jest'],
  env: {
    'jest/globals': true,
    node: true,
    browser: true,
    es6: true,
  },
  rules: {},
};
