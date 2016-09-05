import commonjs from 'rollup-plugin-commonjs';
import config from './rollup.config';

config.plugins.push(commonjs({
  include: 'node_modules/**',
}));

export default {
  format: 'iife',
  sourceMap: true,
  plugins: config.plugins,
  external: ['preact'],
};
