import React from 'react'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'
import {switchToEditorMode} from '../../actions/EditorAction'

class EditorModeSelection extends React.Component {
  render () {
    const {switchToEditorMode} = this.props
    return (
      <div>
        <button onClick={switchToEditorMode.bind(null, 'MODE1')}>Mode 1</button>
        <button onClick={switchToEditorMode.bind(null, 'MODE2')}>Mode 2</button>
      </div>
    )
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({
    switchToEditorMode
  }, dispatch)
}
export default connect(null, mapDispatchToProps)(EditorModeSelection)
