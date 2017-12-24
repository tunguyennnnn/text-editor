import Plain from 'slate-plain-serializer'
import { Editor } from 'slate-react'
import Prism from 'prismjs'
import React from 'react'
import MenuList from './wysiwug/MenuList'
import Menu from './wysiwug/Menu'
import { markGroup, mapping, plugin, blockGroup, html, schema } from './wysiwug/slate-config.js'

function insertImage(change, src, target) {
  if (target) {
    change.select(target)
  }

  change.insertBlock({
    type: 'image',
    isVoid: true,
    data: { src }
  })
}

function handleCodeBlock (event, change) {
  const {value} = change
  if (event.key === 'Enter') {
    if (value.isExpanded) change.delete()
    change.insertText('\n')
    return true
  } else if (event.key === '{') {
    change.insertText('{}')
    event.preventDefault()
  }
}


const iconList = [
  {type: 'bold', hotKey: '⌘+B', icon: 'format_bold'},
  {type: 'italic', hotKey: '⌘+I', icon: 'format_italic'},
  {type: 'title', hotKey: '⌘+H', icon: 'title'},
  {type: 'section', hotKey: '⌘+S', icon: 'subtitles'},
  {type: 'image', icon: 'image'},
  {type: 'code', hotKey: '⌘+C', icon: 'code'}
]


function handleHotKey (event, change) {
  const match = mapping[event.key]
  if (match) {
    event.preventDefault()
    const [nodeType, type] = match
    if (nodeType === 'node') {
      change.toggleMark(type)
      return true
    } else {
      change.setBlock(type)
      return true
    }
  }
  return
}

function handleNewLine (event, change) {
  const {value} = change
  const {startBlock} = value
  switch (startBlock.type) {
    case 'code': {
      return handleCodeBlock(event, change)
    }
    case 'math': {
      event.preventDefault()
      change.insertBlock({type: 'paragraph'})
      return
    }
    default: {
      return
    }
  }
}

function handleAutoComplete (event, change) {
  return
}

export default class Wysiwug extends React.Component {
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

  onSelection () {
    console.log(333333333)
  }

  onKeyDown = (event, change) => {
    const {activeMarks} = change.value
    if (activeMarks) {
      const marks = activeMarks.toArray()
      if (marks.length > 0) {
        console.log(marks[0].type, marks[0].data)
      }
    }
    if (event.metaKey) {
      return handleHotKey(event, change)
    } else if (event.key === 'Enter') {
      return handleNewLine(event, change)
    } else {
      return handleAutoComplete(event, change)
    }
  }

  render() {
    return (
      <div>
        <MenuList iconList={iconList} onClick={this.handleMenuClick}/>
        <Menu
          menuRef={this.menuRef}
          value={this.state.value}
          onChange={this.onChange}
        />
        <Editor
          placeholder='Enter a title...'
          // plugins={plugin}
          value={this.props.value}
          onKeyDown={this.onKeyDown}
          onSelection={this.onSelection}
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
    const type = this.props.value.anchorBlock.type
    if (blockGroup[props.node.type]) return blockGroup[props.node.type].render(props, type === 'math')
  }

  renderMark = (props) => {
    if (markGroup[props.mark.type]) return markGroup[props.mark.type].render(props)
  }

}
