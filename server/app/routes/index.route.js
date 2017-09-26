const express = require('express')
const router = express.Router()
const articlesRoute = require('./article.route')

router.use('/articles', articlesRoute)

module.exports = router
