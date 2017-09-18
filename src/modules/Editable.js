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

class Editable {
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
  }

  getNodeSelection () {
    if (this._active) {
      const {startOffset, endOffset, startContainer, endContainer, collapsed} = window.getSelection().getRangeAt(0)
      if (collapsed) {
        return {
          type: 'SINGLE_SELECTION',
          node: startContainer,
          ch: startOffset
        }
      } else {
        return {
          type: 'MULTIPLE_SELECTION',
          startNode: startContainer,
          endNode: endContainer,
          startCh: startOffset,
          endCh: endOffset
        }
      }
    }
  }

  cleanUpWith ({className}) {
    const relatedNodes = this.editorBody.getElementsByClassName(className)
    _.forEach(relatedNodes, node => {
      if (node) {
        const type = node.getAttribute('type')
        if (type === 'TAIL') {
          if (!node.getAttribute('id')) {
            node.parentNode.removeChild(node)
          }
        } else if (type === 'HEAD') {
          if (!node.getAttribute('id')) {
            const parentNode = node.parentNode
            parentNode.parentNode.innerHTML = '<br>'
          }
        }
      }
    })
  }

  getSelection () {
    if (this._active) {
      const {startOffset, endOffset, startContainer, endContainer, collapsed} = window.getSelection().getRangeAt(0)
      if (collapsed) {
        if (startContainer.nodeName === 'DIV') { // when there is no text
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
          const {lineNumber, parentDiv} = this._getLineNumberOf(startContainer.parentElement)
          const node = startContainer.parentElement.getAttribute('line') ? startContainer : startContainer.parentElement
          const realCh = this._getChOf({
            parent: parentDiv,
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
        if (startContainer.nodeName === 'DIV') {
          startObjects = {
            startLine: Number(startContainer.getAttribute('line')),
            startPos: 0,
            startNode: startContainer
          }
        } else {
          const {lineNumber, parentDiv} = this._getLineNumberOf(startContainer.parentElement)
          const startNode = startContainer.parentElement.getAttribute('line') ? startContainer : startContainer.parentElement
          const realStartCh = this._getChOf({
            parent: parentDiv,
            currentNode: startNode,
            ch: startOffset
          })
          startObjects = {
            startPos: realStartCh,
            startLine: lineNumber,
            startNode
          }
        }
        if (startContainer.nodeName === 'DIV') {
          endObjects = {
            endLine: Number(endContainer.getAttribute('line')),
            endPos: 0,
            endNode: endContainer
          }
        } else {
          const {lineNumber, parentDiv} = this._getLineNumberOf(endContainer.parentElement)
          const endNode = endContainer.parentElement.getAttribute('line') ? endContainer : endContainer.parentElement
          const realEndCh = this._getChOf({
            parent: parentDiv,
            currentNode: endNode,
            ch: endOffset
          })
          endObjects = {
            endPos: realEndCh,
            endLine: lineNumber,
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
        const {reNode, type, chAtNode} = this._findNodeAt({childNodes: this.editorBody.childNodes[startLine].childNodes, ch: startPos})
        return {word: reNode.textContent.slice(0, chAtNode), nodeType: type, node: reNode, selection}
      } else {
        const lineEl = this.editorBody.children[startLine]
        const text = lineEl.textContent
        return {word: text.slice(0, startPos), nodeType: nodeName, node, selection}
      }
    }
  }

  addContainerBefore ({node, withText}) {
    const className = node.getAttribute('class')
    node.parentNode.insertBefore($(`<span class="${className}" type="CONTAINER">${withText}</span>`)[0], node)
  }

  removeHighlight (node) {
    const id = node.getAttribute('id')
    const pairId = node.getAttribute('pairId')
    const pairNode = this.editorBody.querySelector(`#${pairId}`)
    const containerClassName = id.split('-')[1]
    node.parentNode.removeChild(node)
    pairNode.parentNode.removeChild(pairNode)
    _.forEach(this.editorBody.getElementsByClassName(containerClassName), (container) => {
      const textContent = container.textContent
      container.parentNode.replaceChild(document.createTextNode(textContent), container)
    })
    return this
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
    } else if (type === 'BR') {
      const parentNode = reNode.parentNode
      range.setStart(parentNode, 0)
    } else {
      range.setStart(reNode.childNodes[0], chAtNode)
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

  insertMarkDownNodesWithBreak ({line, ch, mdType, container}) {
    const childDiv = this.editorBody.childNodes[line]
    const {reNode, nodeType, chAtNode} = this._findNodeAt({childNodes: childDiv.childNodes, ch})
    const {headId, tailId} = IdManager.generateIdFor({type: mdType})
    const className = headId.split('-')[1]
    const startNode = $(`<span class="${className}" type="CONTAINER"><span type="HEAD" class="${className}" id="${headId}" value="@${mdType}{" pairId="${tailId}" >@${mdType}{</span> </span>`)[0]
    //const midNode = document.createTextNode(' ')
    const endNode = $(`<span type="TAIL" class="${className}" id="${tailId}" pairId="${headId}" value="}" >}</span>`)[0]
    const text = reNode.textContent
    const nextNode = container.nextSibling
    if (chAtNode < text.length) {
      reNode.textContent = text.slice(0, chAtNode - mdType.length - 2)
      const className = container.getAttribute('class')
      const newNode = $(`<span class="${className}" type="CONTAINER">${text.slice(chAtNode)}</span>`)[0]
      childDiv.insertBefore(newNode, nextNode)
      childDiv.insertBefore(startNode, newNode)
      childDiv.insertBefore(endNode, newNode)
    } else {
      reNode.textContent = text.slice(0, chAtNode -  mdType.length - 2)
      childDiv.insertBefore(startNode, nextNode)
      childDiv.insertBefore(endNode, nextNode)
    }
    this.setCaretAt({line, ch: ch + 1})
    EditorState.updateSource('API')
  }

  insertMarkDownNodes ({line, ch, mdType}) {
    const childDiv = this.editorBody.childNodes[line]
    const {reNode, reIndex, nodeType, nextNode} = this._findNodeToInsert({childNodes: childDiv.childNodes, ch})
    const {headId, tailId} = IdManager.generateIdFor({type: mdType})
    const className = headId.split('-')[1]
    const startNode = $(`<span class="${className}" type="CONTAINER"><span type="HEAD" class="${className}" id="${headId}" value="@${mdType}{" pairId="${tailId}" >@${mdType}{</span> </span>`)[0]
    //const midNode = document.createTextNode(' ')
    const endNode = $(`<span type="TAIL" class="${className}" id="${tailId}" pairId="${headId}" value="}" >}</span>`)[0]
    if (nodeType === "#text") {
      const textOfNode = reNode.textContent
      reNode.textContent = textOfNode.slice(0, reIndex - mdType.length - 2)
      const tailText = textOfNode.slice(reIndex)
      if (nextNode) {
        childDiv.insertBefore(startNode, nextNode)
        //childDiv.insertBefore(midNode, nextNode)
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
        //childDiv.appendChild(midNode, nextNode)
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
      EditorState.updateSource('API')
    }
  }

  onTextChange (fn) {
    this.emitter.on('text-change', changes => fn(changes))
    return this
  }

  beforeTextChange (fn) {
    this.emitter.on('before-text-change', changes => fn(changes))
    return this
  }

  onSelectionChange (fn) {
    this.emitter.on('selection-change', changes => {
      fn(changes)
    })
    return this
  }

  onBeforePasteText (fn) {
    this.emitter.on('before-paste-text', changes => fn(changes))
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

  createTextNodeWith ({text, at, after}) {
    const childDiv = this.editorBody.childNodes[at]
    if (after.nextSibling) {
      childDiv.insertBefore(document.createTextNode(text), after.nextSibling)
    } else {
      childDiv.appendChild(document.createTextNode(text))
    }
    if (!after.getAttribute('id')) {
      childDiv.removeChild(after)
    }
    EditorState.updateSource('API')
    return this
  }

  fixNodeAtLine ({line}) {
    const childDiv = this.editorBody.childNodes[line]
    childDiv.childNodes.forEach((child) => {
      if (child.nodeName !== '#text') {
        if (!child.getAttribute('id')) {
          childDiv.removeChild(child)
        }
      }
    })
    EditorState.updateSource('API')
  }

  _setDefaultLines () {
    const {numberOfLines = 10} = this.options
    $(this.editorBody).html(_.range(0, numberOfLines).map((i) => `<div line="${i}"><br></div>`).join(''))
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
    // let changeType = false
    // let oldValue = ''
    // const newLineObserver = new MutationObserver((mutations) => {
    //   changeType = 'NEWLINE'
    // })
    // const newlineConfig = {childList: true}
    // newLineObserver.observe(this.editorBody, newlineConfig)
    //
    // const typingObserver = new MutationObserver((mutations) => {
    //   changeType = 'INSERT-TEXT'
    //   const mutation = mutations.filter(mutation => mutation.type === 'characterData')[0]
    //   console.log(mutations)
    //   if (mutation) {
    //     oldValue = mutation.oldValue
    //   }
    // })
    // const typingConfig = {attributes: true, characterData: true, subtree: true, characterDataOldValue: true}
    // typingObserver.observe(this.editorBody, typingConfig)

    this.editorBody.addEventListener('paste', (e) => {
      const selection = this.getSelection()
      e.preventDefault()
      if (selection.type === 'SINGLE_SELECTION') {
        const text = e.clipboardData.getData('text/plain')
        this.emitter.emit('before-paste-text', {text, node: selection.node, complete: () => { document.execCommand('insertHTML', false, text) }})
      }
    })
    const enterState = {}
    const backspaceState = {}
    $(this.editorBody).keydown(e => {
      const {key} = e
      const selection = this.getSelection()
      if (key === 'Enter') {
        enterState.startLine = selection.startLine
      }
      if (key === 'Backspace') {
        backspaceState.startLine = selection.startLine
      }
      const changes = {}
      changes.key = e.key
      changes.node = selection.node
      changes.event = e
      this.emitter.emit('before-text-change', changes)
    })

    $(this.editorBody).keyup(e => {
      const {key} = e
      if (key === 'Enter') {
        this._correctLineNumber()
        const selection = this.getSelection()
        if (selection.startLine === enterState.startLine) {
          this.emitter.emit('text-change', 'HOTKEY')
        } else {
          this.emitter.emit('text-change', {type: 'NEWLINE'})
        }
      } else if (key === 'Backspace') {
        this._correctLineNumber()
        const selection = this.getSelection()
        if (selection.startLine === backspaceState.startLine) {
          this.emitter.emit('text-change', {type: 'REMOVE'})
        } else {
          this.emitter.emit('text-change', {type: 'REMOVE-LINE'})
        }
      } else {
        if (key.length > 1) {
          this.emitter.emit('text-change', {type: 'HOTKEY'})
        } else {
          this.emitter.emit('text-change', {type: 'INSERT', inserted: key})
        }
      }
    //   const textState = {}
    //   const {key} = e
    //   if (changeType) {
    //     if (changeType === 'NEWLINE') {
    //       textState.type = key === 'Enter' ? 'NEWLINE' : 'REMOVE-LINE'
    //       this._correctLineNumber()
    //     } else {
    //       if (key === 'Backspace') {
    //         textState.type = 'REMOVE'
    //       } else if (key.length > 1) {
    //         textState.type = 'HOTKEY'
    //       } else {
    //         textState.type = 'INSERT'
    //         textState.oldValue = oldValue
    //         textState.inserted = key
    //       }
    //     }
    //     this.emitter.emit('text-change', textState)
    //     changeType = null
    //   } else {
    //     textState.type = 'HOTKEY'
    //     const selection = this.getSelection()
    //     this.emitter.emit('selection-change', selection)
    //   }
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
      if (child.nodeName === '#text' || child.getAttribute('type') === 'TAIL') {
        if (currentNode === child) {
          i += ch
          return false
        } else {
          i += child.textContent.length
        }
      } else if (child.getAttribute('type') === 'CONTAINER') {
        if (currentNode.nodeName === '#text') {
          i += child.textContent.length
        } else if (currentNode.getAttribute('type') === 'CONTAINER') {
          if (currentNode === child) {
            const childNodes = currentNode.childNodes
            if (childNodes.length > 1) {
              i += childNodes[0].textContent.length + ch
            } else {
              i += ch
            }
            return false
          } else {
            i += child.textContent.length
          }
        } else if (currentNode.getAttribute('type') === 'HEAD') {
          if (currentNode.parentElement === child) {
            i += ch
            return false
          } else {
            i += child.textContent.length
          }
        } else {
          i += child.textContent.length
        }
      } else {
        //errors
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
        if (type === '#text' || child.getAttribute('type') === 'TAIL') {
          reNode = child
          chAtNode = ch - i
          return false
        } else {
          const children = child.childNodes
          if (children.length > 1) {
            if (i + children[0].textContent.length >= ch) {
              reNode = children[0]
              chAtNode = ch - i
              return false
            } else {
              reNode = children[1]
              type = "#text"
              chAtNode = ch - i - children[0].textContent.length
              return false
            }
          } else {
            reNode = child.childNodes[0]
            type = "#text"
            chAtNode = ch - i
            return false
          }
        }
      } else {
        i += text.length
      }
    })
    return {reNode, type, chAtNode}
  }

  _getLineNumberOf (element) { // 0 based index
    if (element.nodeName !== 'DIV') {
      return this._getLineNumberOf(element.parentElement)
    } else {
      if (element.getAttribute('line')) return {lineNumber: Number(element.getAttribute('line')), parentDiv: element}
      else return {lineNumber: 0, parentDiv: this.editorBody.childNodes[0]}
    }
  }
}

function anyKeyMatch (word, acTable) {
  const keys = _.keys(acTable)
  return keys.filter((key) => {
    const fullKey = `@${key}{`
    return fullKey === word.slice(word.length - fullKey.length)
  })[0]
}

function fixNode (node) {
  const childNode = node.childNodes[0]
}


class HighlightManager {
  constructor () {
    this.headNode = null
    this.tailNode = null
    this.defaultColor = 'black'
    this.textColor = '#008CBA'
  }

  set (head, tail) {
    if (head === this.headNode && tail === this.tailNode) return this
    this.headNode = head
    this.tailNode = tail
    this.headNode.style.color = this.textColor
    this.tailNode.style.color = this.textColor
    return this
  }

  reset () {
    if (this.headNode) {
      this.headNode.style.color = this.defaultColor
      this.headNode = null
    }
    if (this.tailNode) {
      this.tailNode.style.color = this.defaultColor
      this.tailNode = null
    }
    return this
  }
}

export default function makeEditor (container, options) {
  const highlightManager = new HighlightManager()
  const editor = new Editable(container, options)
  editor.onSelectionChange((changes) => {
    if (changes.type === 'SINGLE_SELECTION') {
      const {node} = changes
      if (node.nodeName === 'SPAN') {
        if (node.getAttribute('type') === 'HEAD' || node.getAttribute('type') === 'TAIL') {
          const pairNode = editor.editorBody.querySelector(`#${node.getAttribute('pairId')}`)
          highlightManager.set(node, pairNode)
        } else {
          highlightManager.reset()
        }
      }
    }
  })
  .beforeTextChange(changes => {
    const {key, node, event} = changes
    if (key === 'Backspace') {
      if (node.nodeName === 'SPAN' && node.getAttribute('type') === 'TAIL') {
        event.preventDefault()
        editor.removeHighlight(node)
      }
    } else if (key === 'Enter') {
      console.log(node)
      if (node.nodeName === 'SPAN') {
        const type = node.getAttribute('type')
        if (type === 'HEAD') {
          const nodeSelection = editor.getNodeSelection()
          const textLength = node.getAttribute('value').length
          if (nodeSelection.ch > 0 && nodeSelection.ch < textLength) {
            event.preventDefault()
          }
        } else if (type === 'TAIL') {
          console.log(editor.getNodeSelection())
        } else if (type === 'CONTAINER') {

        }
      }
    } else {
      if (node.nodeName === 'SPAN' && node.getAttribute('type') === 'TAIL') {
        const nodeSelection = editor.getNodeSelection()
        if (nodeSelection.ch === 0) {
          const previousNode = node.previousSibling
          console.log(previousNode)
          if (previousNode) {
            if (previousNode.getAttribute('class') === node.getAttribute('class') && previousNode.getAttribute('type') === 'CONTAINER') {
              previousNode.textContent += key
            } else {
              editor.addContainerBefore({node, withText: key})
            }
          } else {
            editor.addContainerBefore({node, withText: key})
          }
        }
      }
    }
  })
  .onBeforePasteText (changes => {
    const {node, text, complete} = changes
    switch (node.nodeName) {
      case 'DIV': {
        complete()
        break
      }
      case 'SPAN': {
        if (node.getAttribute('type') === 'HEAD') {
          const nodeSelection = editor.getNodeSelection()
          const textLength = node.getAttribute('value').length
          if (nodeSelection.ch < textLength) {
            // TODO show popups
          } else {
            const nextNode = node.nextSibling
            if (nextNode) {
              nextNode.textContent = text + nextNode.textContent
            } else {
              node.parentNode.appendChild(document.createTextNode(text))
            }
          }
        }
        else if (node.getAttribute('type' === 'TAIL')) {
          const nextNode = node.nextSibling
          const nodeSelection = editor.getNodeSelection()
          const textLength = node.getAttribute('value').length
          if (nodeSelection.ch < textLength) {
            // Do nothing
          } else {
            if (nextNode) {
              node.parentNode.insertBefore(document.createTextNode(text), nextNode)
            } else {
              node.parentNode.appendChild(document.createTextNode(text))
            }
          }
        } else {
          complete()
        }
        break
      }
      default: {
        complete()
      }
    }
  })
  .onTextChange((changes) => {
    if (EditorState.state.source === 'API') {
      EditorState.resetSource()
      return this
    }
    const {type} = changes
    const selection = editor.getSelection()
    if (selection.type === 'SINGLE_SELECTION') {
      if (selection.node.nodeName === '#text') {
        highlightManager.reset()
        if (type === 'INSERT') {
          const {inserted, oldValue} = changes
          if (inserted === '{') {
            const {word, nodeType, node, selection} = editor.getCurrentWord()
            if (nodeType === '#text') {
              const match = anyKeyMatch(word, AUTO_COMPLETE_TABLE, selection)
              if (match) {
                const {startLine, startPos} = selection
                editor.insertMarkDownNodes({line: startLine, ch: startPos, mdType: match})
              }
            }
          }
        }
      } else {
        const {node, startLine, startPos} = selection
        switch (type) {
          case 'INSERT': {
            console.log(node)
            const {inserted} = changes
            if (node.getAttribute('type') === 'CONTAINER') {
              highlightManager.reset()
              if (inserted === '{') {
                const {word, selection} = editor.getCurrentWord()
                const match = anyKeyMatch(word, AUTO_COMPLETE_TABLE, selection)
                if (match) {
                  const {startLine, startPos} = selection
                  editor.insertMarkDownNodesWithBreak({line: startLine, ch: startPos, mdType: match, container: node})
                }
              }
            } else if (node.getAttribute('type') === 'HEAD') {
              const defaultText = node.getAttribute('value')
              const nextNode = node.nextSibling
              const currentText = node.textContent
              node.textContent = defaultText
              if (currentText.indexOf(defaultText) === 0) {
                const extraText = currentText.replace(defaultText, '')
                if (nextNode) {
                  nextNode.textContent = extraText + nextNode.textContent
                  editor.setCaretAt({line: startLine, ch: startPos})
                } else {
                  const newNode = document.createTextNode(extraText)
                  node.parentNode.appendChild(newNode)
                  editor.setCaretAt({line: startLine, ch: startPos})
                }
              } else {
                editor.setCaretAt({line: startLine, ch: startPos})
              }
            } else if (node.getAttribute('type') === 'TAIL') {
              const defaultText = node.getAttribute('value')
              const nextNode = node.nextSibling
              const extraText = node.textContent.replace(defaultText, '')
              node.textContent = defaultText
              if (nextNode) {
                if (nextNode.nodeName === '#text') {
                  nextNode.textContent = extraText + nextNode.textContent
                } else {
                  node.parentNode.insertBefore(document.createTextNode(extraText), nextNode)
                }
              } else {
                node.parentNode.appendChild(document.createTextNode(extraText))
              }
              editor.setCaretAt({line: startLine, ch: startPos})
            }
          }
          case 'REMOVE': {
            if (node.getAttribute('type') === 'HEAD') {
              const defaultText = node.getAttribute('value')
              node.textContent = defaultText
              editor.setCaretAt({line: startLine, ch: startPos})
            }
          }
          case 'NEWLINE': {
            if (node.nodeName === 'SPAN') {
              const type = node.getAttribute('type')
              if (type === 'HEAD') {
                editor.cleanUpWith({className: node.getAttribute('class')})
              } else if (type === 'TAIL') {

              } else if (type === 'CONTAINER') {

              }
            }
          }
        }
      }
    } else {

    }
  })
}
