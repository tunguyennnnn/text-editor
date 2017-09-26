const Promise = require('bluebird')

const getAll = (req, res, next) => {
  res.json({
    data: [
  {
  "title": "Advanced Javascript Tutorial",
  "author": "Luis",
  "summary": "Javascript is a general purpose programming language which supports functional programming features including first class function, currying through .bind method",
  "uid": "1111"
  },
  {
  "title": "SICP",
  "summary": "Scheme is a simple and expressive programming languague. It's a dialect of Lisp.",
  "author": "Tu Nguyen",
  "uid": "2222"
  },
  {
  "title": "Introduction to React",
  "summary": "React is a web frontend framework for single page application",
  "author": "Tu Nguyen",
  "uid": "3333"
  }
  ]

  })
}

const getArticle = (req, res, next) => {

  res.json({data: {"container":{"type":"title","params":[],"value":["Advanced",{"type":"whitespace","value":" "},"Javascript"],"closing":true},"content":[{"container":{"type":"sub","params":[],"value":["Introduction"],"closing":true},"content":[{"container":{"type":"p","params":[],"value":["JavaScript"],"closing":true},"content":[{"type":"whitespace","value":" "},"is",{"type":"whitespace","value":" "},"a",{"type":"whitespace","value":" "},"prorgramming",{"type":"whitespace","value":" "},"language",{"type":"whitespace","value":" \n\n"},{"type":"math","params":[],"mathopen":true,"mathclose":true,"value":"\\int_x^yx^2*ydx","closing":true},{"type":"whitespace","value":"\n\n"},"$code{",{"type":"whitespace","value":"\n"},"function",{"type":"whitespace","value":" "},"(x)",{"type":"whitespace","value":" "},"{",{"type":"whitespace","value":"\n\t"},"if",{"type":"whitespace","value":" "},"(x",{"type":"whitespace","value":" "},">",{"type":"whitespace","value":" "},"4)",{"type":"whitespace","value":" "},"return",{"type":"whitespace","value":" "},"2;",{"type":"whitespace","value":"\n\t"},"else",{"type":"whitespace","value":" "},"return",{"type":"whitespace","value":" "},"4;",{"type":"whitespace","value":"\n"},"}",{"type":"whitespace","value":"\n"},"}",{"type":"whitespace","value":[]}]}]}]}})
}

const createArticle = (req, res, next) => {

}

module.exports = {getAll, getArticle, createArticle}
