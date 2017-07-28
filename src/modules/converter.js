const _ = require('lodash')
const katex = require('katex')

const COLOR_LIST = ['red', 'green', 'orange']
                    .map((color) => color + '{')

const OPENING_CHAR = '\\'
const OPENING_MATH = '$'
const LIST_ITEM_START = '*'
const KEYWORDS = ['b{', 'e{', 'big{', 'ul{', 'code{', '2page{', 'red{'].concat(COLOR_LIST)
const CLOSING_CHAR = '}'
const WHITE_SPACE = ['\t', ' ']
const NEW_LINE = ['\n']

const NAME_MAP = _.assign({
  'b{': 'BOLD',
  'e{': 'EM',
  'big{': 'BIG',
  'ul{': 'ORDER_LIST',
  '*': 'LIST_ITEM',
  'code{': 'CODE',
  '2page{': 'SPLIT_PAGE',
}, _.fromPairs(_.map(COLOR_LIST, (color) => [color, 'COLOR'])))

/*
REGEX
*/

const SINGLE_LINE_MATH_REGEX = /\$.+\$/
const MULTIPLE_LINE_MATH_REGEX = /\$\$.+\$\$/

class Tokenizer {
  constructor () {
    this.tokens = []
    this.index = 0
  }

  handleSpecialToken ({text, start}) {
    const match = _.filter(KEYWORDS, (keyword) => text.indexOf(keyword) === 1)[0]
    console.log(match)
    if (match) {
      return {end: start + match.length, word: (OPENING_CHAR + match), type: NAME_MAP[match]}
    }
  }

  handleMathToken ({text, start}) {
    if (MULTIPLE_LINE_MATH_REGEX.test(text)) {
      const match = MULTIPLE_LINE_MATH_REGEX.exec(text)
      const {index} = match
      if (index === 0) {
        const endMathIndex = text.slice(2).indexOf('$$') + 2
        const matchPhase = text.slice(0, endMathIndex + 2)
        return {word: matchPhase, end: start + matchPhase.length, type: 'NEWLINE_MATH'}
      }
    } else if (SINGLE_LINE_MATH_REGEX.test(text)) {
      const match = SINGLE_LINE_MATH_REGEX.exec(text)
      const {index} = match
      if (index === 0) {
        const endMathIndex = text.slice(1).indexOf('$') + 1
        const matchPhase = text.slice(0, endMathIndex + 1)
        return {word: matchPhase, end: start + matchPhase.length, type: 'INLINE_MATH'}
      }
    }
  }

  pushWord ({start, end, word, type}) {
    if (word.length > 0) {
      this.tokens.push({start, end, word, type})
    }
  }

  tokenize (text) {
    const len = text.length
    let startIndex = 0
    let index = 0
    let char = ''
    let currentWord = ''
    while (index < len) {
      char = text[index]
      switch (char) {
        case OPENING_CHAR: {
          const specialToken = this.handleSpecialToken({text: text.slice(index), start: index + 1})
          if (specialToken) {
            const {end, word, type} = specialToken
            this.pushWord({start: startIndex, end: index - 1, word: currentWord, type: 'ORDINARY'})
            currentWord = ''
            this.pushWord({start: index - 1, end, word, type})
            index = end
            startIndex = end
          } else {
            currentWord = OPENING_CHAR
            index += 1
          }
          break
        }
        case ' ': {
          this.pushWord({start: startIndex, end: index, word: currentWord, type: 'ORDINARY'})
          this.pushWord({start: index, end: index + 1, word: ' ', type: 'SPACE'})
          currentWord = ''
          index += 1
          startIndex = index
          break
        }
        case '\t': {
          this.pushWord({start: startIndex, end: index, word: currentWord, type: 'ORDINARY'})
          this.pushWord({start: index, end: index + 1, word: '\t', type: 'TAB'})
          currentWord = ''
          index += 1
          startIndex = index
          break
        }
        case CLOSING_CHAR: {
          this.pushWord({start: startIndex, end: index, word: currentWord, type: 'ORDINARY'})
          this.pushWord({start: index, end: index + 1, word: CLOSING_CHAR, type: 'CLOSING_CHAR'})
          currentWord = ''
          index += 1
          startIndex = index
          break
        }
        case OPENING_MATH: {
          const foundMath = this.handleMathToken({text: text.slice(index), start: index})
          if (foundMath) {
            const {word, end, type} = foundMath
            this.pushWord({start: index, end, word, type})
            index = end
            currentWord = ''
          } else {
            currentWord += OPENING_MATH
            index += 1
          }
          break
        }
        case LIST_ITEM_START: {
          this.pushWord({start: startIndex, end: index, word: currentWord, type: 'ORDINARY'})
          this.pushWord({start: index, end: index + 1, word: LIST_ITEM_START, type: 'LIST_ITEM'})
          currentWord = ''
          index += 1
          startIndex = index
          break
        }
        default: {
          currentWord += char
          index += 1
        }
      }
    }
    this.pushWord({start: startIndex, end: index, word: currentWord, type: 'ORDINARY'})
    return this.tokens
  }
}

const CONVERTER = {
  '\\b{': {
    tag: '<strong>',
    closeTag: '</strong>'
  },
  '\\e{': {
    tag: '<em>',
    closeTag: '</em>'
  }
}

const Rules = {
  'BOLD': {
    tag: '<strong>',
    closeTag: '</strong>',
    inners: ['EM', 'COLOR']
  },
  'EM': {
    tag: '<em>',
    closeTag: '</em>',
    inners: ['BOLD', 'COLOR']
  },
  'BIG': {
    tag: '<h4>',
    closeTag: '</h4>',
    inners: []
  },
  'ORDER_LIST': {
    tag: '<ul>',
    closeTag: '</ul>',
    inners: ['LIST_ITEM']
  },
  'LIST_ITEM': {
    tag: '<li style="padding-left: 1em">',
    closeTag: '</li>',
    inners: ['BOLD', 'EM', 'COLOR']
  },
  'INLINE_MATH': {
    inners: []
  },
  'NEWLINE_MATH': {
    inners: []
  },
  'COLOR': {
    inners: ['BOLD', 'EM']
  },
  'CODE': {
    tag: '<pre>',
    closeTag: '</pre>',
    inners: []
  },
  'TABLE': {
    inners: ['COLOR', 'BOLD', 'EM']
  }
}

class Element {
  constructor ({type = 'ROOT', word, parent}) {
    this.parent = parent
    this.type = type
    this.word = word
    this.children = []
  }

  appendChild (el) {
    this.children.push(el)
  }

  toHtml () {
    return this.children.map((el, i) => {
      const {type, word, parent} = el
      if (type === 'ORDINARY') {
        return word
      } else if (type === 'INLINE_MATH') {
        const math = word.replace(/\$/g, '')
        return katex.renderToString(math)
      } else if (type === 'NEWLINE_MATH') {
        const math = word.replace(/\$/g, '')
        return `<div class="newline-math">${katex.renderToString(math)}</div>`
      } else if (type === 'COLOR') {
        return `<span style="color:${word.replace('{', '')}">${el.toHtml()}</span>`
      } else {
        const match = Rules[type]
        const {tag, closeTag} = match
        return tag + el.toHtml() + closeTag
      }
    }).join('')
  }
}

class Tracer {
  constructor () {
    this.stack = []
  }

  push (val) {
    this.stack.push(val)
    return this
  }

  pop () {
    this.stack.pop()
    return this
  }

  top () {
    return this.stack[this.stack.length - 1]
  }

  canPush (type) {
    if (this.stack.length === 0) {
      return true
    } else {
      const top = this.top()
      return _.includes(Rules[top].inners, type)
    }
  }

}

window.tracer = new Tracer()

class Parser {
  constructor (tokens) {
    this.tokens = tokens
    this.tracer = new Tracer()
    this.root = new Element({})
    this.currentNode = this.root
    this._parse()
    return this.root
  }

  _parse () {
    const tracer = this.tracer
    this.tokens.forEach((token, index) => {
      const {word, type} = token
      switch (type) {
        case 'BOLD': {
          if (this.tracer.canPush(type)) {
            const newEl = new Element({type, word, parent: this.currentNode})
            this.currentNode.appendChild(newEl)
            this.currentNode = newEl
            this.tracer.push(type)
          } else {

          }
          break
        }
        case 'EM': {
          if (this.tracer.canPush(type)) {
            const newEl = new Element({type, word, parent: this.currentNode})
            this.currentNode.appendChild(newEl)
            this.currentNode = newEl
            this.tracer.push(type)
          } else {

          }
          break
        }
        case 'INLINE_MATH': {
          this.currentNode.appendChild({type, word, parent: this.currentNode})
          break
        }
        case 'NEWLINE_MATH': {
          this.currentNode.appendChild({type, word, parent: this.currentNode})
          break
        }
        case 'BIG': {
          if (this.tracer.canPush(type)) {
            const newEl = new Element({type, word, parent: this.currentNode})
            this.currentNode.appendChild(newEl)
            this.currentNode = newEl
            this.tracer.push(type)
          } else {

          }
          break
        }
        case 'COLOR': {
          if (this.tracer.canPush(type)) {
            const newEl = new Element({type, word, parent: this.currentNode})
            this.currentNode.appendChild(newEl)
            this.currentNode = newEl
            this.tracer.push(type)
          } else {

          }
          break
        }
        case 'ORDER_LIST': {
          if (this.tracer.canPush(type)) {
            const newEl = new Element({type, word, parent: this.currentNode})
            this.currentNode.appendChild(newEl)
            this.currentNode = newEl
            this.tracer.push(type)
          } else {

          }
        }
        case 'LIST_ITEM': {
          if (this.tracer.top() === 'LIST_ITEM') {
            this.currentNode = this.currentNode.parent
            tracer.pop()
          }
          if (this.tracer.canPush(type)) {
            const newEl = new Element({type, word, parent: this.currentNode})
            this.currentNode.appendChild(newEl)
            this.currentNode = newEl
            this.tracer.push(type)
          } else {

          }
          break
        }
        case 'CLOSING_CHAR': {
          if (tracer.top() === 'LIST_ITEM') {
            this.tracer.pop()
          }
          this.tracer.pop()
          this.currentNode = this.currentNode.parent
          break
        }
        default: {
          this.currentNode.appendChild(new Element({type: 'ORDINARY', word}))
        }
      }
    })
  }
}

export function translate1 (string) {
  const tokenizer = new Tokenizer()
  const tokens = tokenizer.tokenize(string)
  console.log(tokens)
  const parsedTree = new Parser(tokens)
  return parsedTree.toHtml()
}

export function translate (string) {
  const tokenizer = new Tokenizer
  const tokens = tokenizer.tokenize(string)
  translate1(string)
  let html = ''
  let closeTag = null
  _.forEach(tokens, (token) => {
    const {word, type} = token
    if (type === 'BOLD' || type === 'EM') {
      const match = CONVERTER[word]
      html += match.tag
      closeTag = match.closeTag
    } else if (type === 'CLOSING_CHAR') {
      if (closeTag) {
        html += closeTag
        closeTag = null
      } else {
        html += word
      }
    } else if (type === 'INLINE_MATH') {
      const math = word.replace(/\$/g, '')
      html += katex.renderToString(math)
    } else if (type === 'NEWLINE_MATH') {
      const math = word.replace(/\$/g, '')
      html += `<div class="newline-math">${katex.renderToString(math)}</div>`
    } else {
      html += word
    }
  })
  return html
}
window.translate = translate
export default translate1
