const webpack = require('webpack')
const WebpackDevServer = require('webpack-dev-server')
const config = require('./webpack.config')

new WebpackDevServer(webpack(config), {
  hot: true,
  historyApiFallback: true,
  quiet: false,
  noInfo: false,
  proxy: {
    '/api': {
      target: 'http://localhost:4000',
      secure: false
    }
  },
  stats: {
    // assets: false,
    colors: true,
    version: true,
    hash: false
    // timings: false,
    // chunks: false
    // chunkModules: false
  }
}).listen(8080, 'localhost', function (err) {
  if (err) {
    console.log(err)
  }
  console.log('Listening at localhost:8080')
})
