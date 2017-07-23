const COMPLETE = {
  '_bold{': '}',
  '_italic{': '}'
}

const SPLIT_CHAR = '_'
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
