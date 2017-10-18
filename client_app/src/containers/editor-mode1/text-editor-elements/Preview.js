import React from 'react'
import {translate} from '../../../modules/converter'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'

class Preview extends React.Component {
  componentDidUpdate () {
    const html = translate(this.props.previewText)
    const {previewText} = this.props
    // const previews = previewText.filter((line) => (line && line.length !== 0))
    //                             .map((line) => `<div>${translate(line)}</div>`)
    console.log(previewText.filter((line) => line))
    const preview = `<div>${translate(previewText.filter((line) => line).join(' '))}</div>`
    this.previewer.innerHTML = preview
  }

  componentDidMount () {
    this.previewer = document.getElementById('text-preview')
  }

  render () {
    const previewStyle = {
      position: 'absolute', width: '80%', height: '100px',
      border: '2px solid teal', background: 'white',
      left: '4%', bottom: '10%', overflowY: 'scroll'
    }

    return (
      <div id='text-preview' style={previewStyle}>
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
