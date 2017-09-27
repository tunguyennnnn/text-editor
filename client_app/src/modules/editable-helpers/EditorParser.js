const _ = require('lodash')

export function parsePasteText (text) {
  
}

export function anyKeyMatch (word, acTable) {
  const keys = _.keys(acTable)
  return keys.filter((key) => {
    const fullKey = `@${key}{`
    return fullKey === word.slice(word.length - fullKey.length)
  })[0]
}
