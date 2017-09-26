const debug = process.env.NODE_ENV !== 'production'
const webpack = require('webpack')

module.exports = {
  context: __dirname + '/src',
  devtool: debug ? "inline-sourcemap" : null,
  entry: './index.js',
  module: {
    loaders: [
      {
        test: /\.js?$/,
        exclude: /(node_modules | bower_components)/,
        loader: 'babel-loader',
        query: {
          presets: ['react', 'es2015', 'stage-0'],
          plugins: ['react-html-attrs', 'transform-class-properties', 'transform-decorators-legacy']
        }
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1
            }
          },
          'postcss-loader'
        ]
      },
      {
        test: /\.(eot|svg|ttf|woff|woff2)$/,
        loader: 'file?name=public/fonts/[name].[ext]'
      }
    ]
  },
  output: {
    path: __dirname + '/src/',
    filename: 'index.min.js'
  },
  plugins: debug ? [] : [
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.optimize.UglifyJsPlugin({mangle: false, sourcemap: false})
  ]
}
