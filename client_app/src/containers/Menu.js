import React from 'react'
import ReactDOM from 'react-dom'
const root = window.document.querySelector('main')

export default class Menu extends React.Component {
  hasMark (type) {
    const { value } = this.props
    return value.activeMarks.some(mark => mark.type === type)
  }

  onClickMark (event, type) {
    const { value, onChange } = this.props
    event.preventDefault()
    const change = value.change().toggleMark(type)
    onChange(change)
  }

  renderMarkButton (type, icon) {
    const isActive = this.hasMark(type)
    const onMouseDown = event => this.onClickMark(event, type)

    return (
      <span class='button' onMouseDown={onMouseDown} data-active={isActive}>
        <span class='material-icons'>{icon}</span>
      </span>
    )
  }
  render () {
    return (
      <div class='menu hover-menu' ref={this.props.menuRef}>
        {this.renderMarkButton('bold', 'format_bold')}
        {this.renderMarkButton('italic', 'format_italic')}
        {this.renderMarkButton('underlined', 'format_underlined')}
        {this.renderMarkButton('code', 'code')}
      </div>
    )
  }
}
