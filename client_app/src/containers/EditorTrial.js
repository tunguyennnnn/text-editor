import React from 'react'
import makeEditor from '../modules/Editable'

export default class EditorTrial extends React.Component {
  componentDidMount () {
    this.editorDiv = document.getElementById('text-editor-trial')
    this.previewDiv = document.getElementById('text-editor-preview')
    const editable = makeEditor(this.editorDiv, {})
    const editorPreview = makeEditor(this.previewDiv)
  }

  render () {
    const style = {width: '500px', height: '600px', border: '2px solid black'}
    return (
      <div style={style}>
        <div id='text-editor-trial'>
        </div>
        <div id='text-editor-preview'>
        </div>
      </div>
    )
  }
}
