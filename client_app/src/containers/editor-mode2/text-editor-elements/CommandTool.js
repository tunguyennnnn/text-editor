import React from 'react'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'
import {HotKeys} from 'react-hotkeys'
import CodeMirror from 'codemirror'

class CommandTool extends React.Component {

  componentDidUpdate () {
    if (this.props.commandToolState.show) {
      $(this.commandToolContainer).show()
      this.editor.focus()
    } else {
      $(this.commandToolContainer).hide()
    }
  }
  componentDidMount () {
    this.commandToolContainer = document.getElementById('command-tool-container')
    this.commandEditorDiv = document.getElementById('command-editor')
    this.editor = CodeMirror(this.commandEditorDiv)
    this.editor = CodeMirror(this.commandEditorDiv)
    this.wrapper = this.editor.getWrapperElement()
    _.range(1, 10).map(() => {
      this.editor.execCommand('newlineAndIndent')
    })
    $(this.commandToolContainer).hide()
  }

  switchModeHandler () {
    this.props.hideCommandTool()
  }

  render () {
    const style = {
      position: 'absolute', width: '80%', height: '200px',
      border: '1px solid #545767',
      left: '2%', bottom: '5%', overflowY: 'scroll'
    }
    const commandEditorStyle = {
      backgroundColor: 'black',
      fontColor: 'grey'
    }
    const {commandToolState} = this.props
    const keyMap = {
      switchMode: 'ctrl+q'
    }

    const hotKeysHanlder = {
      switchMode: this.switchModeHandler.bind(this)
    }

    return (
      <div id='command-tool-container' style={style}>
        <HotKeys keyMap={keyMap} handlers={hotKeysHanlder}>
          <div id='command-editor' style={commandEditorStyle}>
          </div>
        </HotKeys>
      </div>
    )
  }
}


const mapStateToProps = (state) => {
  return {
    commandToolState: state.commandToolState
  }
}

export default connect(mapStateToProps)(CommandTool)
