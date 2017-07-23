import React from 'react'
import CodeMirror from 'codemirror'
import * as ED from '../../modules/EditorModule'
import * as AutoC from '../../modules/AutoCompleter'

export default class TextEditor extends React.Component {

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

      if (removed[0].length > 0) { //delete action
      } else if (text[0].length > 0) { // insert text
        const currentWord = ED.currentWord(this.editor)
        const completeWord = AutoC.getComplete(currentWord)
        const {line, ch} = this.editor.getCursor()
        if (completeWord) {
          ED.insertWord(this.editor, completeWord)
          this.editor.setCursor({line, ch})
        }
        this.props.preview(this.editor.getLine(line))
      } else if (text.length === 2) { // new line

      } else if (removed.length === 0) { // remove line

      }
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
