
// https://babeljs.io/docs/en/options#babelrcroots
module.exports = {
  presets: [
    '@babel/preset-env',
    '@babel/preset-react',
    // '@babel/preset-typescript',
  ],
  plugins: [
    '@babel/plugin-transform-runtime',
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-proposal-nullish-coalescing-operator',
    '@babel/plugin-proposal-logical-assignment-operators'
  ]
};

// TODO: Plugins; Aliases
// We don't currently use aliases, but this is a nice snippet that would help
// [
//   'module-resolver',
//   {
//     // https://github.com/tleunen/babel-plugin-module-resolver/issues/338
//     // There seem to be a bug with module-resolver with a mono-repo setup:
//     // It doesn't resolve paths correctly when using root/alias combo, so we
//     // use this function instead.
//     resolvePath(sourcePath, currentFile, opts) {
//       // This will return undefined if aliases has no key for the sourcePath,
//       // in which case module-resolver will fallback on its default behaviour.
//       return aliases[sourcePath];
//     },
//   },
// ],
