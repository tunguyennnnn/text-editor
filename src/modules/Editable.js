const _ = require('lodash')
const EventEmitter = require('eventemitter3')
import EditorState from './editable-helpers/EditorState'
import * as IdManager from './editable-helpers/IdManager'

const AUTO_COMPLETE_TABLE = {
  "bold": "bold",
  "b"   : "bold",

  "italic": "italic",
  "i"     : "italic",

  "highlight": "highlight",
  "h"        : "highlight",

  "note": "note",
  "n"   : "note",

  "self-note": "self-note",
  "sn"       : "self-note",

  "size": "size",
  "s"   : "size",

  // doc structure
  "title": "title",

  "sec"    : "sec",

  "subsection": "sub",
  "sub"       : "sub",

  "subsubsection": "ssub",
  "ssub"         : "ssub",

  "subsubsubsection": "sssub",
  "sssub"           : "sssub",

  "paragraph": "p",
  "p"        : "p",

  // other elements
  "code": "code",
  "c"   : "code",

  "code-bl": "code-block",
  "c-bl"   : "code-block",

  "display": "display",
  "d"      : "display",

  "img-s": "image-small",
  "i-s"  : "image-small",
  "img-m": "image-medium",
  "i-m"  : "image-medium",
  "img-l": "image-large",
  "i-l"  : "image-large",

  "table": "table",
  "tb"   : "table",
  "cell" : "tb-cell",
  "c"    : "tb-cell",

  "unordered-list": "unordered-list",
  "ul"            : "unordered-list",
  "ordered-list"  : "ordered-list",
  "ol"            : "ordered-list",

  "item": "list-item",
  "it"  : "list-item",

  "definition-list": "definition-list",
  "dl"             : "definition-list",

  "space": "space",
  "sp"   : "space",

  "newline": "newline",
  "nl"     : "newline",

  "center": "center",
  "ct"    : "center",

  "math" : "math",
  "m"    : "math",
  "m-seq": "math-sequence",

  "math-block": "math-block",
  "m-bl"      : "math-block",
  "mbl-seq"   : "math-sequence-block",

  "identifier": "identifier",
  "id"        : "identifier",

  "reference": "reference",
  "ref"      : "reference",

  "eval": "eval",
  "e"   : "e"
}

export default class Editable {
  constructor (container, options = {}) {
    // internal objects
    this.options = options
    this._active = false
    this.emitter = new EventEmitter()
    // DOM
    this.container = container
    this.editorBody = document.createElement('div')
    this.editorBody.setAttribute('contentEditable', 'true')
    window.editorBody = this.editorBody
    this.container.appendChild(this.editorBody)

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

    // handle options
    const {notifiable = true} = options
    if (notifiable) {
      this._notifyOnCaretChange()
    }
    const {autoCompletable = true, acTable = AUTO_COMPLETE_TABLE} = options
    if (autoCompletable) {
      this._applyAutoCompleteWith(acTable)
    }
  }

  getSelection () {
    if (this._active) {
      const {startOffset, endOffset, startContainer, endContainer, collapsed} = window.getSelection().getRangeAt(0)
      if (collapsed) {
        if (startContainer.getAttribute) { // when there is no text
          const line = Number(startContainer.getAttribute('line'))
          return {
            type: 'SINGLE_SELECTION',
            startLine: line,
            startPos: 0,
            endPos: 0,
            endLine: line,
            node: startContainer
          }
        } else {
          const {lineNumber, parent} = this._getLineNumberOf(startContainer.parentElement)
          const node = startContainer.parentElement.getAttribute('line') ? startContainer : startContainer.parentElement
          const realCh = this._getChOf({
            parent,
            currentNode: node,
            ch: startOffset
          })
          return {
            type: 'SINGLE_SELECTION',
            startLine: lineNumber,
            startPos: realCh,
            endPos: realCh,
            endLine: lineNumber,
            node: node
          }
        }
      } else {
        let startObjects, endObjects
        if (startContainer.getAttribute) {
          startObjects = {
            startLine: Number(startContainer.getAttribute('line')),
            startPos: 0,
            startNode: startContainer
          }
        } else {
          const start = this._getLineNumberOf(startContainer.parentElement)
          const startNode = startContainer.parentElement.getAttribute('line') ? startContainer : startContainer.parentElement
          const realStartCh = this._getChOf({
            parent: start.parent,
            currentNode: startNode,
            ch: startOffset
          })
          startObjects = {
            startPos: realStartCh,
            startLine: start.lineNumber,
            startNode
          }
        }
        if (endContainer.getAttribute) {
          endObjects = {
            endLine: Number(endContainer.getAttribute('line')),
            endPos: 0,
            endNode: endContainer
          }
        } else {
          const end = this._getLineNumberOf(endContainer.parentElement)
          const endNode = endContainer.parentElement.getAttribute('line') ? endContainer : endContainer.parentElement
          const realEndCh = this._getChOf({
            parent: end.parent,
            currentNode: endNode,
            ch: endOffset
          })
          endObjects = {
            endPos: realEndCh,
            endLine: end.lineNumber,
            endNode
          }
        }
        return _.assign({type: 'MULTIPLE_SELECTION'}, startObjects, endObjects)
      }
    }
  }

  getCurrentWord () {
    const selection = this.getSelection()
    const {type} = selection
    if (type === 'SINGLE_SELECTION') {
      const {startPos, startLine, node} = selection
      const nodeName = node.nodeName
      if (nodeName === 'DIV' && node.getAttribute('line')) {
        return {word: '', nodeType: node.nodeName, node, selection}
      } else if (nodeName !== '#text') {
        return {word: node.textContent, nodeType: nodeName, node, selection}
      } else {
        const lineEl = this.editorBody.children[startLine]
        const text = lineEl.textContent
        return {word: text.slice(0, startPos), nodeType: nodeName, node, selection}
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

  setCaretAt ({line, ch}) {
    const childDiv = this.editorBody.childNodes[line]
    const {reNode, type, chAtNode} = this._findNodeAt({childNodes: childDiv.childNodes, ch})
    const range = document.createRange()
    const selection = document.getSelection()
    if (type === '#text') {
      range.setStart(reNode, chAtNode)
    } else {
      if (type === "BR") {
        const parentNode = reNode.parentNode
        range.setStart(parentNode, 0)
      } else {
        range.setStart(reNode.childNodes[0], chAtNode)
      }
    }
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  insertHtmlAt ({line, ch, html, type = 'text'}) {
    const children = this.editorBody.children
    const len = children.length
    if (line >= len) {
      return this
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
              } else {
                const tailNode = document.createTextNode(' ')
                child.insertBefore(tailNode, nextNode)
              }
            } else {
              child.appendChild(midNode)
              if (tailText.length > 0) {
                const tailNode = document.createTextNode(tailText)
                child.appendChild(tailNode)
              } else {
                const tailNode = document.createTextNode(' ')
                child.appendChild(tailNode)
              }
            }
          }
        }
      }
    }
    return this
  }

  insertMarkDownNodes ({line, ch, mdType}) {
    const childDiv = this.editorBody.childNodes[line]
    const {reNode, reIndex, nodeType, nextNode} = this._findNodeToInsert({childNodes: childDiv.childNodes, ch})
    const {headId, tailId} = IdManager.generateIdFor({type: mdType})
    const startNode = $(`<span id="${headId}" value="@${mdType}{" pairId="${tailId}">@${mdType}{</span>`)[0]
    const midNode = document.createTextNode('  ')
    const endNode = $(`<span id="${tailId}" pairId="${headId}" value="}">}</span>`)[0]
    if (nodeType === "#text") {
      const textOfNode = reNode.textContent
      reNode.textContent = textOfNode.slice(0, reIndex - mdType.length - 2)
      const tailText = textOfNode.slice(reIndex)
      if (nextNode) {
        childDiv.insertBefore(startNode, nextNode)
        childDiv.insertBefore(midNode, nextNode)
        childDiv.insertBefore(endNode, nextNode)
        if (tailText.length > 0) {
          const tailNode = document.createTextNode(tailText)
          childDiv.insertBefore(tailNode, nextNode)
        } else {
          const tailNode = document.createTextNode(' ')
          childDiv.insertBefore(tailNode, nextNode)
        }
      } else {
        childDiv.appendChild(startNode, nextNode)
        childDiv.appendChild(midNode, nextNode)
        childDiv.appendChild(endNode, nextNode)
        if (tailText.length > 0) {
          const tailNode = document.createTextNode(tailText)
          childDiv.appendChild(tailNode)
        } else {
          const tailNode = document.createTextNode(' ')
          childDiv.appendChild(tailNode)
        }
      }
      this.setCaretAt({line, ch: ch + 1})
    }
  }

  onTextChange (fn) {
    this.emitter.on('text-change', changes => fn(changes))
    return this
  }

  onSelectionChange (fn) {
    this.emitter.on('selection-change', changes => fn(changes))
    return this
  }

  replaceTextAt ({line, from, to, withHtml}) {
    const div = this.editorBody.childNodes[line]
    const {reNode, type, chAtNode} = this._findNodeAt({childNodes: div.childNodes, ch: from})
    if (type === '#text') {
      const text = reNode.textContent
      reNode.textContent = text.slice(0, chAtNode) + text.slice(to - from + chAtNode)
      this.insertHtmlAt({line, ch: from, html: withHtml, type: 'HTML'})
    }
  }

  /* Init methods */

  _applyAutoCompleteWith (acTable) {
    this.onTextChange((changes) => {
      if (EditorState.state.source === 'API') {
        console.log('Reach')
        EditorState.resetSource()
        return this
      }
      console.log('Reach 2')
      const {type} = changes
      const selection = this.getSelection()
      if (selection.type === 'SINGLE_SELECTION') {
        if (selection.node.nodeName === '#text') {
          if (type === 'INSERT') {
            const {inserted, oldValue} = changes
            if (inserted === '{') {
              const {word, nodeType, node, selection} = this.getCurrentWord()
              if (nodeType === '#text') {
                const match = this._anyKeyMatch(word, acTable, selection)
                console.log(match)
                if (match) {
                  const {startLine, startPos} = selection
                  const {headId, tailId} = IdManager.generateIdFor({type: match})
                  this.insertMarkDownNodes({line: startLine, ch: startPos, mdType: match})
                  EditorState.updateSource('API')
                }
              }
            }
          }
        } else {
          const {startLine, startPos, node} = selection
          const nextNode = node.nextSibling
          const defaultText = node.getAttribute('value')
          const extraText = node.textContent.replace(defaultText, '')
          if (extraText.length > 0) {
            node.textContent = defaultText
            if (nextNode) {
              if (nextNode.nodeName === '#text') {
                console.log(extraText)
                nextNode.textContent = extraText + nextNode.textContent
                this.setCaretAt({line: startLine, ch: startPos})
              } else {
                console.log(extraText)
                console.log(this.editorBody.childNodes[startLine].childNodes)
                this._createTextNodeWith({text: extraText, at: startLine, after: node})
                this.setCaretAt({line: startLine, ch: startPos})
              }
            } else {
              console.log(extraText)
              this._createTextNodeWith({text: extraText, at: startLine, after: node})
              this.setCaretAt({line: startLine, ch: startPos})
            }
            EditorState.updateSource('API')
          }
        }
      } else {

      }
    })
  }

  _createTextNodeWith ({text, at, after}) {
    const childDiv = this.editorBody.childNodes[at]
    console.log(after)
    if (after.nextSibling) {
      childDiv.insertBefore(document.createTextNode(text), after.nextSibling)
    } else {
      childDiv.appendChild(document.createTextNode(text))
    }
    if (!after.getAttribute('id')) {
      childDiv.removeChild(after)
    }
  }

  _anyKeyMatch (word, acTable, selection) {
    const keys = _.keys(acTable)
    return keys.filter((key) => {
      const fullKey = `@${key}{`
      return fullKey === word.slice(word.length - fullKey.length)
    })[0]
  }

  _setDefaultLines () {
    const {numberOfLines = 10} = this.options
    $(this.editorBody).html(_.range(0, numberOfLines).map((i) => `<div line="${i}"><br></div>`).join(''))
  }

  _notifyOnCaretChange () {
    this.emitter.on('selection-change', (changes) => {
      const {type, node} = changes
      if (type === 'SINGLE_SELECTION') {
        if (node.nodeName !== '#text' && node.getAttribute('pairId')) {
          const id = node.getAttribute('id')
          const pairId = node.getAttribute('pairId')
          this.openingEl = this.editorBody.querySelector(`#${id}`)
          this.closingEl = this.editorBody.querySelector(`#${pairId}`)
          this.openingEl.style.color = 'blue'
          this.closingEl.style.color = 'blue'
        } else {
          this._endNotifyOnCaretChange()
        }
      }
    })
  }

  _endNotifyOnCaretChange () {
    if (this.openingEl) {
      this.openingEl.style.color = 'black'
    }
    if (this.closingEl) {
      this.closingEl.style.color = 'black'
    }
  }

  _addKeyListener () {
    let changeType = false
    let oldValue = ''
    const newLineObserver = new MutationObserver((mutations) => {
      changeType = 'NEWLINE'
    })
    const newlineConfig = {childList: true}
    newLineObserver.observe(this.editorBody, newlineConfig)

    const typingObserver = new MutationObserver((mutations) => {
      changeType = 'INSERT-TEXT'
      const mutation = mutations.filter(mutation => mutation.type === 'characterData')[0]
      if (mutation) {
        oldValue = mutation.oldValue
      }
    })
    const typingConfig = {attributes: true, characterData: true, subtree: true, characterDataOldValue: true}
    typingObserver.observe(this.editorBody, typingConfig)
    $(this.editorBody).keyup((e) => {
      const textState = {}
      const {key} = e
      if (changeType) {
        if (changeType === 'NEWLINE') {
          textState.type = key === 'Enter' ? 'NEWLINE' : 'REMOVE-LINE'
          this._correctLineNumber()
        } else {
          textState.type = key === 'Backspace' ? 'REMOVE' : 'INSERT'
          textState.oldValue = oldValue
          textState.inserted = key
        }
        this.emitter.emit('text-change', textState)
        changeType = null
      } else {
        textState.type = 'HOTKEY'
        const selection = this.getSelection()
        this.emitter.emit('selection-change', selection)
      }
    })
  }

  _addCaretListener () {
    $(this.editorBody).on('selectstart', (e) => {
      $(document).one('mouseup', (e) => {
        this.emitter.emit('selection-change', this.getSelection())
      })
    })
  }

  _addFocusListener () {
    $(this.editorBody).focus((e) => {
      this._active = true
    })
    $(this.editorBody).blur((e) => {
      this._active = false
    })
  }

  /* Support methods */
  _correctLineNumber () {
    _.each(this.editorBody.children, (child, i) => {
      child.setAttribute('line', i)
    })
  }

  _getChOf ({parent, currentNode, ch}) {
    let i = 0
    _.forEach(parent.childNodes, (child) => {
      if (child === currentNode) {
        i += ch
        return false
      } else {
        i += child.textContent.length
      }
    })
    return i
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
    let i = 0, reNode = null, type, chAtNode = 0
    _.forEach(childNodes, (child, index) => {
      const text = child.textContent
      type = child.nodeName
      if (i + text.length >= ch) {
        reNode = child
        chAtNode = ch - i
        return false
      } else {
        i += text.length
      }
    })
    return {reNode, type, chAtNode}
  }

  _getLineNumberOf (element) { // 0 based index
    if (element.nodeName === '#text') {
      return {lineNumber: Number(element.parentElement.getAttribute('line')), parent: element.parentElement}
    } else if (element.getAttribute && element.getAttribute('line')) {
      return {lineNumber: Number(element.getAttribute('line')), parent: element}
    } else {
      return this._getLineNumberOf(element.parentElement)
    }
  }
}
