import path from 'path'
import commonjs from 'rollup-plugin-commonjs'
import config from './rollup.config'

const pkg = require('./package.json')

config.plugins.push(commonjs({
  include: 'node_modules/**'
}));

export default {
  entry: path.resolve(__dirname, 'index.js'),
  dest: path.resolve(__dirname, pkg['browser:main']),
  format: 'iife',
  moduleName: 'PreactEnroute',
  sourceMap: true,
  plugins: config.plugins,
  external: ['preact'],
}
