const mongoose = require('mongoose')
const Promise = require('bluebird')
const _ = require('lodash')
const Schema = mongoose.Schema
mongoose.Promise = require('bluebird')

const ArticleSchema = new Schema({
  title: {type: String, default: 'No Title'},
  body: {type: Schema.ObjectId, default: {}},
  author: {type: String, default: 'no author'},
  keywords: [{type: String, default: ''}],
  created_date: {type: Date, default: Date.now},
  updated_info: [{date: Date, body: Schema.ObjectId, author: String}]
}, {collection: 'Articles'})

ArticleSchema.statics = {
  
}

module.exports = ArticleSchema
