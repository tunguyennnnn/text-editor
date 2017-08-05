import React from 'react'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'
import {preview} from '../../actions/PreviewAction'
import {showCommandTool, hideCommandTool} from '../../actions/CommandToolAction'

import Preview from './text-editor-elements/Preview'
import TextEditor from './text-editor-elements/TextEditor'
import CommandTool from './text-editor-elements/CommandTool'

class EditorMode2 extends React.Component {
  render () {
    //const style = {position: 'relative', overflow: 'hidden'}
    const {preview, showCommandTool, hideCommandTool} = this.props
    return (
      <div>
        <Preview />
        <TextEditor preview={preview} showCommandTool={showCommandTool} />
        <CommandTool hideCommandTool={hideCommandTool} />
      </div>
    )
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({
    preview,
    showCommandTool,
    hideCommandTool
  }, dispatch)
}
export default connect(null, mapDispatchToProps)(EditorMode2)
