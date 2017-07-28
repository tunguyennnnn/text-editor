const _ = require('lodash')
const COLOR_LIST = ['red', 'green', 'orange']
                    .map((color) => '\\' + color + '{')
const COMPLETE = _.assign({}, {
  '\\b{': '}',
  '\\e{': '}',
  '\\big{': '}',
  '\\red{': '}',
  '\\ul{': '}',
  '\\code{': '}',
  '\\2page{': '}',
  '$': '$'
}, _.fromPairs(_.map(COLOR_LIST, (color) => [color, '}'])))

const SPLIT_CHAR = '\\'
export function getComplete (word) {

  if (COMPLETE[word]) {
    return COMPLETE[word]
  } else {
    const words = word.split(SPLIT_CHAR)
    const len = words.length
    if (len > 1) {
      return COMPLETE[`${SPLIT_CHAR}${words[len - 1]}`]
    }
  }
}
