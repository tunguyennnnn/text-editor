import React from 'react'
import CodeMirror from 'codemirror'
import * as ED from '../../../modules/EditorModule'
import * as AutoC from '../../../modules/AutoCompleter'

const LINE_LIMIT = 10
export default class TextEditor extends React.Component {

  selectLine ({currentLine}) {
    const startLine = currentLine - LINE_LIMIT < 0 ? 0 : currentLine - LINE_LIMIT
    const endLine = currentLine + LINE_LIMIT
    return {startLine, endLine}
  }

  componentDidMount () {
    this.editorDiv = document.getElementById('text-editor')
    this.editor = CodeMirror(this.editorDiv, {
      lineNumbers: true,
      viewportMargin: 1000000
    })
    this.wrapper = this.editor.getWrapperElement()
    for (let x = 0; x < 29; x++) {
      this.editor.
      execCommand('newlineAndIndent')
    }
    window.editor = this.editor
    this.editor.on('change', (cm, change) => {
      const {from, to, removed, text} = change
      let type
      if (removed[0].length > 0) { //delete action
        type = 'DELETE'
      } else if (text[0].length > 0) { // insert text
        type = 'INSERT'
      } else if (text.length === 2) { // new line
        type = 'NEWLINE'
      } else { // remove line
        type = 'DELETE_LINE'
      }

      switch (type) {
        case 'INSERT': {
          const {line, ch} = this.editor.getCursor()
          const sentence = this.editor.getLine(line)
          const completeWord = AutoC.getComplete(sentence.slice(0, ch))
          if (completeWord) {
            ED.insertWord(this.editor, completeWord)
            this.editor.setCursor({line, ch})
          }
          break
        }
      }
      this.props.preview([this.editor.getValue()])
    })
  }
  render () {
    const style = {
      width: '80%', float: 'left', position: 'relative',
      border: '1px solid #545767',
      minHeight: window.innerHeight,
    }
    return (
      <div style={style}>
        <div id='text-editor' style={{height: 'auto'}}>
        </div>
      </div>
    )
  }
}
