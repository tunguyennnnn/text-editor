const _ = require('lodash')
const OPENING_CHAR = '_'
const KEYWORDS = ['bold{', 'italic{']
const CLOSING_CHAR = '}'
const WHITE_SPACE = ['\t', ' ']
const NEW_LINE = ['\n']


class Tokenizer {
  constructor () {
    this.tokens = []
    this.index = 0
  }

  handleSpecialToken ({text, start}) {
    console.log(text, start)
    const match = _.filter(KEYWORDS, (keyword) => text.indexOf(keyword) !== -1)[0]
    if (match) {
      return {end: start + match.length, word: (OPENING_CHAR + match)}
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
          console.log(text)
          const specialToken = this.handleSpecialToken({text: text.slice(index), start: index + 1})
          if (specialToken) {
            const {end, word} = specialToken
            this.pushWord({start: startIndex, end: index - 1, word: currentWord, type: 'ORDINARY'})
            currentWord = ''
            this.pushWord({start: index - 1, end, word, type: 'SPECIAL'})
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
  '_bold{': {
    tag: '<strong>',
    closeTag: '</strong>'
  },
  '_italic{': {
    tag: '<em>',
    closeTag: '</em>'
  }
}

export function translate (string) {
  const tokenizer = new Tokenizer
  const tokens = tokenizer.tokenize(string)
  let html = ''
  let closeTag = null
  _.forEach(tokens, (token) => {
    const {word, type} = token
    if (type === 'SPECIAL') {
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
    } else {
      html += word
    }
  })
  return html
}
window.translate = translate
export default translate
