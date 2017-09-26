const express = require('express')
const bodyParser = require('body-parser')
const expressWinston = require('express-winston')
const compress = require('compression')
const routes = require('./app/routes/index.route')
const winstonInstance = require('./winston')
const mongoose = require('mongoose')
const config = require('./config/development')
const Promise = require('bluebird')
mongoose.Promise = Promise
mongoose.connect(config.db, { server: { socketOptions: { keepAlive: 1 } } })
mongoose.connection.on('error', () => {
  throw new Error(`unable to connect to database: ${config.db}`)
})

const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(compress())

app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'X-Requested-With')
  next()
})

app.use('/api', routes)

expressWinston.requestWhitelist.push('body')
expressWinston.responseWhitelist.push('body')

app.use(expressWinston.logger({
  winstonInstance,
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms',
  colorStatus: true
}))

const PORT = 4000
app.listen(PORT, () => {
  winstonInstance.info(`Server started on port ${PORT}`)
})

module.exports = app
