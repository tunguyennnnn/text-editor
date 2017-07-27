const _ = require('lodash')
const COMPLETE = {
  '\\b{': '}',
  '\\e{': '}',
  '\\big{': '}',
  '\\red{': '}',
  '\\ul{': '}',
  '\\code{': '}',
  '\\2page{': '}',
  '$': '$'
}

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
