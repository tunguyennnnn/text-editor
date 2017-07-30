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

const COMPLETE_LIST = [/^.*\\b{$/g, /^.*\\e{$/g, /^.*\\big{$/g,
                       /^.*\\ul{$/g, /^.*\\code{$/g, /^.*\\2page{$/,
                       /^.*\\red{$/g, /^.*\\orange{$/g, /^.*\\green{$/g,
                       /.*\\tb:\d+:\d+{$/g]

// const SPLIT_CHAR = '\\'
// export function getComplete (word) {
//   if (COMPLETE[word]) {
//     return COMPLETE[word]
//   } else {
//     const words = word.split(SPLIT_CHAR)
//     const len = words.length
//     if (len > 1) {
//       return COMPLETE[`${SPLIT_CHAR}${words[len - 1]}`]
//     }
//   }
// }

const generateTable = (sentence) => {
  const tbRegex = /\\tb:\d+:\d+{$/g
  const match = tbRegex.exec(sentence)
  const matchWord = match[0]
  const splits = matchWord.split(':')
  console.log(splits)
  const colNumber = Number(splits[1])
  const rowNumber = Number(splits[2].replace('{', ''))
  if (colNumber > 0 && rowNumber > 0) {
    // const row = _.range(0, colNumber).map((i) => '|  ').join('') + '|'
    // return row + '\n' + _.range(0, colNumber).map((i) => '---').join('-') + '\n' + _.range(0, rowNumber).map((i) => row).join('\n')
    const headers = _.range(1, colNumber + 1).map((i) => {
      return `\\(header-${i}){ }`
    }).join('\n')

    const body = _.range(1, rowNumber + 1).map((row) => {
      return _.range(1, colNumber + 1).map((col) => {
        return `\\(${col},${row}){ }`
      }).join('\n')
    }).join('\n')

    return '\n' + headers + '\n' + body + '\n'
  }
}

window.generateTable = generateTable

export function getComplete (sentence) {
  const match = _.filter(COMPLETE_LIST, (regex) => {
    if (regex.test(sentence)) {
      return regex
    }
  })[0]
  if (match) {
    if (/.*\\tb:\d+:\d+{$/g.test(sentence)) {
      return '\n' + generateTable(sentence) + '\n}'
    }
    return '}'
  }
}
