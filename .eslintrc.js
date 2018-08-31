module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es6: true,
    node: true,
  },
  extends: 'eslint:recommended',
  parser: 'babel-eslint',
  // parserOptions: {
  //   ecmaVersion: 2018,
  //   sourceType: 'module',
  // },
  plugins: ['jest'],
  env: {
    'jest/globals': true,
    node: true,
    browser: true,
    es6: true,
  },
  rules: {},
};
