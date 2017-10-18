import React from 'react'
import {translate} from '../../../modules/tokenizer'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'

class Preview extends React.Component {

  componentDidUpdate () {
    //const html = translate(this.props.previewText)
    const {previewText} = this.props
    const preview = `<div>${translate(previewText.filter((line) => line).join(' '))}</div>`
    //const preview = `<div>${translate(previewText.filter((line) => line).join(' '))}</div>`
    this.previewer.innerHTML = preview
    $('pre.code-block').each((i, block) => {
       hljs.highlightBlock(block)
    })
    this.previewerContainer.scrollTop = $(this.previewer).height()
  }

  componentDidMount () {
    this.previewerContainer = document.getElementById('preview-container')
    this.previewer = document.getElementById('text-preview')
  }

  render () {
    const style = {
      width: '80%', position: 'relative',
      border: '1px solid teal', background: 'white',
      minHeight: window.innerHeight * 2 / 3, overflowY: 'scroll'
    }

    const previewerStyle = {
      width: '100%', position: 'absolute', height: '100%', bottom: 0
    }

    return (
      <div id='preview-container' style={style}>
        <div id='text-preview' style={previewerStyle}>
        </div>
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
