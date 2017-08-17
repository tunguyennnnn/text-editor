const _ = require('lodash')
import EditorEmitter from './editable-helpers/EditorEmitter'

function addLines({container, numberOfLines}) {

}

export default class Editable {
  constructor (container, options = {}) {
    // internal objects
    this.options = options
    this._active = false
    this.emitter = new EditorEmitter()
    // DOM
    this.container = container
    this.editorBody = document.createElement('div')
    this.editorBody.setAttribute('contentEditable', 'true')
    window.editorBody = this.editorBody
    this.container.appendChild(this.editorBody)

    // handle options

    // set intial lines
    const numberOfLines = options.numberOfLines = options.numberOfLines || 10
    const containerWidth = this.container.style.width
    const containerHeight = this.container.style.height
    this.editorBody.style.width = containerWidth

    this._setDefaultLines()
    this._addKeyListener()
    this._addCaretListener()
    this._addFocusListener()


    // debugging:
    window.editable = this
  }

  getSelection () {
    if (this._active) {
      const {
        startOffset,
        endOffset,
        startContainer,
        endContainer,
        collapsed
      } = window.getSelection().getRangeAt(0)
      if (collapsed) { // no selection
        console.log(startContainer)
        let line, node
        if (startContainer.getAttribute('line')) {
          line = Number(startContainer.getAttribute('line'))
          node = startContainer
        } else {
          line = this._getLineNumberOf(startContainer.parentElement)
          node = startContainer.parentElement
        }
        return {type: 'SINGLE_SELECTION', startLine: line, startPos: startOffset, endLine: line, endPos: startOffset, node}
      } else {
        const startLine = this._getLineNumberOf(startContainer.parentElement)
        const endLine = this._getLineNumberOf(endContainer.parentElement)
        return {type: 'MULTIPLE_SELECTION', startLine, startPos: startOffset, endLine, endPos: endOffset}
      }
    }
  }

  getNumberOfLine () {
    return this.editorBody.childElementCount
  }

  getFullText () {
    return _.map(this.editorBody.children, (child) => {
      const text = child.innerText
      if (text.indexOf('\n') !== -1) {
        return text
      }
      return text + '\n'
    }).join('')
  }

  insertHtmlAt ({line, ch, html, type = 'text'}) {
    const children = this.editorBody.children
    const len = children.length
    if (line >= len) {
      return null
    } else {
      const child = children[line]
      const childNodes = child.childNodes
      const text = child.innerText
      if (text.length >= ch) {
        const {reNode, reIndex, nodeType, nextNode} = this._findNodeToInsert({childNodes, ch})
        if (type === 'text') {
          const textOfNode = reNode.textContent
          const newHtml = textOfNode.slice(0, reIndex) + html + textOfNode.slice(reIndex)
          reNode.textContent = newHtml
        } else {
          if (nodeType === '#text') { // only allows insert html to text node
            const textOfNode = reNode.textContent
            reNode.textContent = textOfNode.slice(0, reIndex)
            const midNode = $(html)[0]
            const tailText = textOfNode.slice(reIndex)
            if (nextNode) {
              child.insertBefore(midNode, nextNode)
              if (tailText.length > 0) {
                const tailNode = document.createTextNode(tailText)
                child.insertBefore(tailNode, nextNode)
              }
            } else {
              child.appendChild(midNode)
              if (tailText.length > 0) {
                const tailNode = document.createTextNode(tailText)
                child.appendChild(tailNode)
              }
            }
          }
        }
        return true
      }
    }
  }

  _findNodeToInsert ({childNodes, ch}) {
    let i = 0, reNode = null, reIndex = 0, type, nextNode = null
    _.forEach(childNodes, (child, index) => {
      const text = child.textContent
      type = child.nodeName
      if (i + text.length > ch) {
        reNode = child
        reIndex = ch - i
        nextNode = childNodes[index + 1]
        return false
      } else if (i + text.length === ch) {
        if (childNodes[index + 1] && childNodes[index + 1].nodeName === '#text' && child.nodeName !== '#text') {
          i += text.length
        } else {
          reNode = child
          reIndex = ch - i
          nextNode = childNodes[index + 1]
          return false
        }
      } else {
        i += text.length
      }
    })
    return {reNode, reIndex, nodeType: type, nextNode}
  }

  _findNodeAt ({childNodes, ch}) {
    let i = 0, reNode = null, type
    _.forEach(childNodes, (child, index) => {
      const text = child.textContent
      type = child.nodeName
      if (i + text.length >= ch) {
        reNode = child
        return false
      } else {
        i += text.length
      }
    })
    return {reNode, type}
  }

  _getLineNumberOf (element) { // 0 based index
    console.log(element)
    if (element.nodeName === '#text') {
      return Number(element.parentElement.getAttribute('line'))
    } else if (element.getAttribute && element.getAttribute('line')) {
      return Number(element.getAttribute('line'))
    } else {
      return this._getLineNumberOf(element.parentElement)
    }
  }

  _setDefaultLines () {
    const {numberOfLines = 10} = this.options
    $(this.editorBody).html(_.range(0, numberOfLines).map((i) => `<div line="${i}"><br></div>`).join(''))
  }

  _addKeyListener () {
    $(this.editorBody).keyup((e) => {
      console.log(e.key, e)
      if (e.key === 'Enter') {
        this._correctLineNumber()
      }
    })
  }

  _correctLineNumber () {
    _.each(this.editorBody.children, (child, i) => {
      child.setAttribute('line', i)
    })
  }

  _addCaretListener () {
    $(this.editorBody).on('selectstart', (e) => {
      console.log('select start')
      $(document).one('mouseup', (e) => {
        const {type, startLine, startPos, node} = this.getSelection()
        console.log(startLine, startPos)
        if (type === 'SINGLE_SELECTION') {
          console.log(node)
        }
      })
    })
  }

  _addFocusListener () {
    $(this.editorBody).focus((e) => {
      console.log('focus')
      this._active = true
    })
    $(this.editorBody).blur((e) => {
      console.log('blur')
      this._active = false
    })
  }
}
