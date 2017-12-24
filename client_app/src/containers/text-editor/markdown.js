import React from 'react'
import { Editor } from 'slate-react'
import Plain from 'slate-plain-serializer'
import Prism from 'prismjs'
import { schema, blockPlugins } from './wysiwug/slate-config.js'
import {blockGroup, markGroup} from './markdown/slate-config'

export default class MarkdownEditor extends React.Component {
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
    let top = rect.top + window.scrollY - menu.offsetHeight
    if (top <= 0) {
      top += rect.top + window.scrollY + menu.offsetHeight + rect.height
    }
    menu.style.top = `${top}px`
    menu.style.left = `${rect.left + window.scrollX - menu.offsetWidth / 2 + rect.width / 2}px`
  }

  menuRef = (menu) => {
    this.menu = menu
  }

  onChange = ({ value }) => {
    // console.log(html.serialize(value))
    // this.setState({ value })
    this.props.saveChange(value)
  }

  onClickImage = (event) => {
    event.preventDefault()
    const src = window.prompt('Enter the URL of the image:')
    if (!src) return

    const change = this.state.value
      .change()
      .call(insertImage, src)

    this.onChange(change)
  }

  handleMenuClick = (event, type) => {
    event.preventDefault()
    const change = this.state.value.change().toggleMark(type).focus()

    this.onChange(change)
  }

  decorateNode = (node) => {
    if (node.type !== 'code') return

    const language = 'js'
    const texts = node.getTexts().toArray()
    const string = texts.map(t => t.text).join('\n')
    const grammar = Prism.languages[language]
    const tokens = Prism.tokenize(string, grammar)
    console.log(texts, string, tokens)
    const decorations = []
    let startText = texts.shift()
    let endText = startText
    let startOffset = 0
    let endOffset = 0
    let start = 0

    for (const token of tokens) {
      startText = endText
      startOffset = endOffset

      const content = typeof token == 'string' ? token : token.content
      const newlines = content.split('\n').length - 1
      const length = content.length - newlines
      const end = start + length

      let available = startText.text.length - startOffset
      let remaining = length

      endOffset = startOffset + remaining

      while (available < remaining) {
        endText = texts.shift()
        remaining = length - available
        available = endText.text.length
        endOffset = remaining
      }

      if (typeof token != 'string') {
        const range = {
          anchorKey: startText.key,
          anchorOffset: startOffset,
          focusKey: endText.key,
          focusOffset: endOffset,
          marks: [{ type: token.type }],
        }

        decorations.push(range)
      }

      start = end
    }

    return decorations
  }

  onKeyDown = (event, change) => {
    const {value} = change
    const {startBlock} = value
    if (event.key !== 'Enter') return
    if (startBlock.type != 'code') return
    if (value.isExpanded) change.delete()
    change.insertText('\n')
    return true
  }

  render() {
    console.log(this.props.value.document.nodes)
    return (
      <div>
        <Editor
          placeholder='Enter a title...'
          plugins={blockPlugins}
          value={this.props.value}
          onKeyDown={this.onKeyDown}
          schema={schema}
          onChange={this.onChange}
          renderMark={this.renderMark}
          renderNode={this.renderNode}
          decorateNode={this.decorateNode}
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
