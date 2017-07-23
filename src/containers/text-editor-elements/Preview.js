import React from 'react'
import Quill from 'quill'
import translate from '../../modules/converter'

import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'

class Preview extends React.Component {
  componentDidUpdate () {
    const html = translate(this.props.previewText)
    this.previewer.innerHTML = html
  }

  componentDidMount () {
    this.previewer = document.getElementById('text-preview')
  }

  render () {
    const previewStyle = {
      position: 'absolute', width: '80%', height: '100px',
      border: '2px solid teal', background: 'white',
      left: '4%', bottom: '10%'
    }
    const {previewText} = this.props

    return (
      <div id='text-preview' style={previewStyle}>
        {translate(previewText)}
      </div>
    )
  }
}


const mapStateToProps = (state) => {
  return {
    previewText: state.previewText
  }
}

export default connect(mapStateToProps)(Preview)
