import React from 'react'
import CodeMirror from 'codemirror'
import * as ED from '../../../modules/EditorModule'
import * as AutoC from '../../../modules/AutoCompleter'

export default class TextEditor extends React.Component {

  componentDidMount () {
    this.editorContainer = document.getElementById('text-editor-container')
    this.editorDiv = document.getElementById('text-editor')
    this.editor = CodeMirror(this.editorDiv, {
      lineNumbers: true,
      viewportMargin: 1000000
    })
    this.wrapper = this.editor.getWrapperElement()
    _.range(1, 10).map(() => {
      this.editor.execCommand('newlineAndIndent')
    })
    const divHeight = $(this.editorDiv).find('.CodeMirror-code').children().first().height()

    $(this.editorContainer).height($(this.editorDiv).height())

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

      // adjust scroll
      const {line} = this.editor.getCursor()
      if (line >= 5) {
        this.editorContainer.scrollTop = (line + 1 - 5) * divHeight
      } else {
        this.editorContainer.scrollTop = 0
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
      position: 'absolute', width: '80%', height: '200px',
      border: '1px solid #545767', background: 'white',
      left: '2%', bottom: '5%', overflowY: 'scroll'
    }
    return (
      <div id='text-editor-container' style={style}>
        <div id='text-editor'>
        </div>
      </div>
    )
  }
}
