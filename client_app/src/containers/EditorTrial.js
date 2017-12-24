import React from 'react'
import makeEditor from '../modules/Editable1'

export default class EditorTrial extends React.Component {
  componentDidMount () {
    this.editorDiv = document.getElementById('text-editor-trial')
    const editable = makeEditor(this.editorDiv, {})
  }

  render () {
    const style = {width: '500px', height: '600px', border: '2px solid black'}
    return (
      <div style={style}>
        <div id='text-editor-trial'>
        </div>
      </div>
    )
  }
}
