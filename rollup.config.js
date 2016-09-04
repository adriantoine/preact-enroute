import path from 'path'
import babel from 'rollup-plugin-babel'
import nodeResolve from 'rollup-plugin-node-resolve'

const pkg = require('./package.json')

const external = Object.keys(pkg.dependencies).concat(Object.keys(pkg.peerDependencies))

export default {
  entry: path.resolve(__dirname, 'index.js'),
  plugins: [
    babel(),
    nodeResolve({
      jsnext: true,
      main: true,
    }),
  ],
  external,
  targets: [
    {
      dest: path.resolve(__dirname, pkg.main),
      format: 'umd',
      moduleName: 'preactEnroute',
      sourceMap: true,
    },
    {
      dest: path.resolve(__dirname, pkg['jsnext:main']),
      format: 'es',
      sourceMap: true,
    },
  ],
}
