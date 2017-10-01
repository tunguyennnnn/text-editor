export function currentWord (editor) {
  const {line, ch} = editor.getCursor()
  const {head, anchor} = editor.findWordAt({line, ch})
  const headCh = head.ch
  const anchorCh = anchorCh
  const words = editor.getRange({line, ch: 0}, {line, ch: headCh}).split(/\s+/)
  const len = words.length
  return words[len - 1]
}

export function insertWord (editor, word) {
  editor.replaceSelection(word)
}
