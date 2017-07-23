import React from 'react'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'
import {preview} from '../actions/PreviewAction'

import Preview from './text-editor-elements/Preview'
import TextEditor from './text-editor-elements/TextEditor'
import SectionTree from './text-editor-elements/SectionTree'

class Editor extends React.Component {

  componentDidMount () {

  }

  render () {
    const style = {position: 'relative', overflow: 'hidden'}
    return (
      <div style={{}}>
        <TextEditor preview={this.props.preview}/>
        <SectionTree />
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
export default connect(null, mapDispatchToProps)(Editor)
