/**
 * for some reason the tests would not pass when using `.babelrc`
 * https://github.com/babel/babel/issues/8892#issuecomment-430644216
 */
module.exports = {
  presets: ['@babel/flow', '@babel/preset-typescript'],
  plugins: [
    ['@babel/plugin-transform-modules-commonjs', {allowTopLevelThis: true}],
    '@babel/plugin-proposal-object-rest-spread',
    '@babel/plugin-proposal-class-properties',
  ],
  retainLines: true,
};
