const _ = require('lodash')

const SPECIAL_KEYS = ['table', 'cell', 'tb', 'c']
const AUTO_COMPLETE_TABLE = {
  "bold": "bold",
  "b"   : "bold",

  "italic": "italic",
  "i"     : "italic",

  "highlight": "highlight",
  "h"        : "highlight",

  "note": "note",
  "n"   : "note",

  "self-note": "self-note",
  "sn"       : "self-note",

  "size": "size",
  "s"   : "size",

  // doc structure
  "title": "title",

  "sec"    : "sec",

  "subsection": "sub",
  "sub"       : "sub",

  "subsubsection": "ssub",
  "ssub"         : "ssub",

  "subsubsubsection": "sssub",
  "sssub"           : "sssub",

  "paragraph": "p",
  "p"        : "p",

  // other elements
  "code": "code",
  "c"   : "code",

  "code-bl": "code-block",
  "c-bl"   : "code-block",

  "display": "display",
  "d"      : "display",

  "img-s": "image-small",
  "i-s"  : "image-small",
  "img-m": "image-medium",
  "i-m"  : "image-medium",
  "img-l": "image-large",
  "i-l"  : "image-large",

  "table": "table",
  "tb"   : "table",
  "cell" : "tb-cell",
  "c"    : "tb-cell",

  "unordered-list": "unordered-list",
  "ul"            : "unordered-list",
  "ordered-list"  : "ordered-list",
  "ol"            : "ordered-list",

  "item": "list-item",
  "it"  : "list-item",

  "definition-list": "definition-list",
  "dl"             : "definition-list",

  "space": "space",
  "sp"   : "space",

  "newline": "newline",
  "nl"     : "newline",

  "center": "center",
  "ct"    : "center",

  "math" : "math",
  "m"    : "math",
  "m-seq": "math-sequence",

  "math-block": "math-block",
  "m-bl"      : "math-block",
  "mbl-seq"   : "math-sequence-block",

  "identifier": "identifier",
  "id"        : "identifier",

  "reference": "reference",
  "ref"      : "reference",

  "eval": "eval",
  "e"   : "e"
}

export function parsePasteText (text) {

}

export function anyKeyMatch (word) {
  const keys = _.keys(AUTO_COMPLETE_TABLE)
  let res
  keys.forEach(key => {
    if (SPECIAL_KEYS.includes(key)) {
      const regex = new RegExp(`@${key}:\\d:\\d\{$`)
      const match = word.match(regex)
      if (match) {
        res = {key: match[0].slice(1, match[0].length - 1), type: 'SPECIAL'}
        return false
      }
    } else {
      const fullKey = `@${key}{`
      if (fullKey === word.slice(word.length - fullKey.length)) {
        res = {key, type: 'NORMAL'}
      }
    }
  })
  return res
}
