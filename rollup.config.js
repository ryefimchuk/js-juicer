import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import pkg from './package.json';

const globals = {
  'uglify-js': 'UglifyJS',
  'esprima': 'esprima',
  'escope': 'escope'
};

export default [{
  input: `src/index.ts`,
  output: [
    {file: pkg.main, name: 'jsJuicer', format: 'umd', globals: globals},
    {file: pkg.module, format: 'es', globals: globals}
  ],
  external: Object.keys(globals),
  plugins: [
    typescript({useTsconfigDeclarationDir: true}),
    commonjs(),
    resolve()
  ]
}];
