module.exports = {
  presets: ['@babel/preset-flow'],
  plugins: [
    ['transform-es2015-modules-commonjs', {allowTopLevelThis: true}],
    '@babel/plugin-proposal-object-rest-spread',
    '@babel/plugin-proposal-class-properties',
  ],
  retainLines: true,
};
