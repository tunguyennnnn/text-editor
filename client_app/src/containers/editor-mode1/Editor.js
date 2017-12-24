import React from 'react'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'
import {preview} from '../../actions/PreviewAction'

import Preview from './text-editor-elements/Preview'
import TextEditor from './text-editor-elements/TextEditor'

class EditorMode1 extends React.Component {
  render () {
    return (
      <div style={{}}>
        <TextEditor preview={this.props.preview} />
        <Preview />
      </div>
    )
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({
    preview
  }, dispatch)
}
export default connect(null, mapDispatchToProps)(EditorMode1)
