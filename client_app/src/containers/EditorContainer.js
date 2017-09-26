import React from 'react'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'

import EditorMode1 from './editor-mode1/Editor'
import EditorMode2 from './editor-mode2/Editor'
import EditorModeSelection from './editor-utilities/EditorModeSelection'

class EditorContainer extends React.Component {
  render () {
    const {mode} = this.props.textEditorState
    console.log(mode)
    if (mode === 'MODE1') {
      return (
        <div>
          <EditorModeSelection />
          <EditorMode1 />
        </div>
      )
    } else {
      return (
        <div>
          <EditorModeSelection />
          <EditorMode2 />
        </div>
      )
    }
  }
}
const mapStateToProps = (state) => {
  return {
    textEditorState: state.textEditorState
  }
}

export default connect(mapStateToProps)(EditorContainer)
