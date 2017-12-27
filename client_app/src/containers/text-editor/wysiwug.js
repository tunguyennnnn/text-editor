import Plain from 'slate-plain-serializer'
import * as _ from 'lodash'
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
      const anyNotParagraph = change.value.blocks.some(block => block.type !== 'paragraph')
      change.setBlock(anyNotParagraph ? 'paragraph' : type)
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
  console.log(event.key)
  if (event.key === 'Tab') {
    event.preventDefault()
    change.insertText('  ')
  }
  return
}

function codeTokenize (language = 'js', text) {
  const grammar = Prism.languages[language]
  const tokens = Prism.tokenize(text, grammar)
  const decorations = []
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
    if (node.type === 'paragraph') {
      const text = node.nodes.first()
      const childrenLeaves = text.getLeaves().toArray()
      const decorations = []
      const grammar = Prism.languages['js']
      // const codeNodes = childrenLeaves.filter(leaf => {
      //   return leaf.marks.size > 0 && leaf.marks.first().type === 'code-line'
      // })
      // codeNodes.forEach(node => {
      //   codeTokenize('js', node.text)
      // })
      let startOffset = 0
      let endOffset = 0
      let start = 0
      childrenLeaves.forEach(leaf => {
        const {marks} = leaf
        window.marks = marks
        if (marks.size > 0 && _.some(marks.toArray(), m => m.type === 'code-line')) {
          // console.log('code ', leaf.text)
          const tokens = Prism.tokenize(leaf.text, grammar)
          let start = 0
          let end = 0
          for (const token of tokens) {
            const content = typeof token === 'string' ? token : token.content
            if (typeof token === 'string') {
              start = end += token.length
            } else {
              decorations.push({
                anchorKey: text.key,
                anchorOffset: startOffset + start,
                focusKey: text.key,
                focusOffset: (startOffset + start + token.content.length),
                marks: [{type: token.type}]
              })
              start = end += token.content.length
            }
          }
        }
        startOffset += leaf.text.length
      })
      console.log(decorations)
      return decorations
    }
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
    console.log(decorations)
    return decorations
  }

  onSelect (event, change) {
    console.log(event, change)
    window.change = change
  }

  onKeyDown = (event, change) => {
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
          value={this.props.value}
          onChange={this.onChange}
        />
        <Editor
          placeholder='Enter a title...'
          // plugins={plugin}
          value={this.props.value}
          onKeyDown={this.onKeyDown}
          onSelection={this.onSelection}
          schema={schema}
          onSelect={this.onSelect}
          onChange={this.onChange}
          renderMark={this.renderMark}
          renderNode={this.renderNode}
          decorateMark={this.renderMark}
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
    // let activeMarks = this.props.value.activeMarks
    // let isMath = false
    // if (activeMarks) {
    //   activeMarks = activeMarks.toArray()
    //   if (activeMarks.length > 0) {
    //     isMath = _.some(activeMarks, (mark) => mark.type === 'math')
    //   }
    // }
    if (markGroup[props.mark.type]) return markGroup[props.mark.type].render(props, true)
  }

}
