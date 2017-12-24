import React from 'react'

export default class MenuList extends React.Component {
  generateIconList () {
    const {iconList = []} = this.props
    return iconList.map(({hotKey, icon, type}, i) => {
      return (
        <span key={i}>
          <div>
            <span class='button' onClick={this.onClickIcon.bind(this, type)}>
              <span class='material-icons'>{icon}</span>
            </span>
          </div>
          <div style={{color: '#aaa'}}>
            <span>{hotKey}</span>
          </div>
        </span>
      )
    })
  }

  onClickIcon (type, event) {
    this.props.onClick(event, type)
  }

  render () {
    return (
      <div class='menu toolbar-menu' ref={this.props.menuRef}>
        {this.generateIconList()}
      </div>
    )
  }
}
