import React from 'react'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'
import {preview} from '../../actions/PreviewAction'

import Preview from './text-editor-elements/Preview'
import TextEditor from './text-editor-elements/TextEditor'

class EditorMode2 extends React.Component {
  render () {
    console.log(this.props.preview)
    const style = {position: 'relative', overflow: 'hidden'}
    return (
      <div>
        <Preview />
        <TextEditor preview={this.props.preview} />
      </div>
    )
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({
    preview
  }, dispatch)
}
export default connect(null, mapDispatchToProps)(EditorMode2)
