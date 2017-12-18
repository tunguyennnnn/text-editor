import Plain from 'slate-plain-serializer'
import { Editor } from 'slate-react'
import React from 'react'
import Menu from './Menu'
import { markGroup, markPlugins, blockGroup, blockPlugins, html, schema } from './slate-config.js'

function CodeNode(props) {
  return <pre {...props.attributes}><code>{props.children}</code></pre>
}

class App extends React.Component {

  state = {
    value: Plain.deserialize(''),
  }

  componentDidMount = () => {
    this.updateMenu()
  }

  componentDidUpdate = () => {
    this.updateMenu()
  }

  updateMenu = () => {
    const { value } = this.state
    const menu = this.menu
    if (!menu) return

    if (value.isBlurred || value.isEmpty) {
      menu.removeAttribute('style')
      return
    }

    const selection = window.getSelection()
    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    menu.style.opacity = 1
    menu.style.top = `${rect.top + window.scrollY - menu.offsetHeight}px`
    menu.style.left = `${rect.left + window.scrollX - menu.offsetWidth / 2 + rect.width / 2}px`
  }

  menuRef = (menu) => {
    this.menu = menu
  }

  onChange = ({ value }) => {
    console.log(html.serialize(value))
    this.setState({ value })
  }

  render() {
    return (
      <div>
        <Menu
          menuRef={this.menuRef}
          value={this.state.value}
          onChange={this.onChange}
        />
        <Editor
          placeholder='Enter a title...'
          plugins={markPlugins.concat(blockPlugins)}
          value={this.state.value}
          onChange={this.onChange}
          renderMark={this.renderMark}
          renderNode={this.renderNode}
        />
      </div>
    )
  }

  renderNode = (props) => {
    if (blockGroup[props.node.type]) return blockGroup[props.node.type].render(props)
  }

  renderMark = (props) => {
    if (markGroup[props.mark.type]) return markGroup[props.mark.type].render(props)
  }

}
export default App
