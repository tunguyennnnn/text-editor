const express = require('express')
const router = express.Router()
const articleCtrl = require('../controllers/articles.controller')

router.route('/')
  .get(articleCtrl.getAll)

router.route('/:articleId')
  .get(articleCtrl.getArticle)

module.exports = router
