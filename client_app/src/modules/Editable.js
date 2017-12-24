const _ = require('lodash')
const EventEmitter = require('eventemitter3')
import EditorState from './editable-helpers/EditorState'
import * as IdManager from './editable-helpers/IdManager'
import * as EditorPaser from './editable-helpers/EditorParser'
import * as Dom from './editable-helpers/Dom'
import EditorInfo from './editable-helpers/EditorInfo'
import HtmlGenrator from './EditorHtmlGenerator'

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
    this.editorInfo = new EditorInfo(this.container)

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

  getNodes (selection) {
    const sel = selection || this.getSelection()
    const {startLine, endLine, startNode, endNode} = sel
    let res = []
    if (startLine === endLine) {
      const parentNode = this.editorBody.childNodes[startLine]
      const childNodes = parentNode.childNodes
      const startParent = Dom.getParentOf(startNode)
      const endParent = Dom.getParentOf(endNode)
      if (startParent.parent === endParent.parent) {
        res = [startParent]
      } else {
        let push = false
        childNodes.forEach(node => {
          if (push) {
            if (node === endParent.parent) {
              res.push(endParent)
              return push = false
            } else {
              res.push(Dom.getParentOf(node))
            }
          } else {
            if (node === startParent.parent) {
              push = true
              res.push(startParent)
            }
          }
        })
      }
      return res
    } else {
      const childNodes = []
      _.range(startLine, endLine + 1).map(lineNumber => {
        this.editorBody.childNodes[lineNumber].childNodes.forEach(node => childNodes.push(node))
      })
      console.log(childNodes)
      const startParent = Dom.getParentOf(startNode)
      const endParent = Dom.getParentOf(endNode)
      let push = false
      childNodes.forEach(node => {
        if (push) {
          if (node === endParent.parent) {
            res.push(endParent)
            return push = false
          } else {
            res.push(Dom.getParentOf(node))
          }
        } else {
          if (node === startParent.parent) {
            push = true
            res.push(startParent)
          }
        }
      })
      return res
    }
  }

  getSelectionText (selection = this.getSelection()) {
    const {startNode, endNode, startLine, endLine, startPos, endPos} = selection
    if (startLine === endLine) {
      const parentNode = this.editorBody.childNodes[startLine]
      return {text: parentNode.textContent.slice(startPos, endPos), nodeList: this.getNodes(selection)}
    } else {
      return {text: '', nodeList: this.getNodes(selection)}
    }
  }

  getSelection () {
    if (this._active) {
      const range = window.getSelection().getRangeAt(0)
      const {startOffset, endOffset, startContainer, endContainer, collapsed} = range
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
        if (endContainer.nodeName === 'DIV') {
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
    const containers = $(`.${containerClassName}`)
    containers.each((i, el) => {
      const textContent = $(el).text()
      $(el).replaceWith(document.createTextNode(textContent))
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
    const {key, type} = mdType
    const childDiv = this.editorBody.childNodes[line]
    const {reNode, nodeType, chAtNode} = this._findNodeAt({childNodes: childDiv.childNodes, ch})
    const {headId, tailId} = IdManager.generateIdFor({type: key})
    const className = headId.split('-')[1]
    const startNode = $(`<span class="${className}" type="CONTAINER"><span type="HEAD" class="${className}" id="${headId}" value="@${key}{" pairId="${tailId}" >@${key}{</span> </span>`)[0]
    //const midNode = document.createTextNode(' ')
    const endNode = $(`<span type="TAIL" class="${className}" id="${tailId}" pairId="${headId}" value="}" >}</span>`)[0]
    const text = reNode.textContent
    const nextNode = container.nextSibling
    if (chAtNode < text.length) {
      reNode.textContent = text.slice(0, chAtNode - key.length - 2)
      const className = container.getAttribute('class')
      const newNode = $(`<span class="${className}" type="CONTAINER">${text.slice(chAtNode)}</span>`)[0]
      childDiv.insertBefore(newNode, nextNode)
      childDiv.insertBefore(startNode, newNode)
      childDiv.insertBefore(endNode, newNode)
    } else {
      reNode.textContent = text.slice(0, chAtNode - key.length - 2)
      childDiv.insertBefore(startNode, nextNode)
      childDiv.insertBefore(endNode, nextNode)
    }
    this.setCaretAt({line, ch: ch + 1})
    EditorState.updateSource('API')
  }

  insertMarkDownNodes ({line, ch, mdType}) {
    const {key, type} = mdType
    const childDiv = this.editorBody.childNodes[line]
    const {reNode, reIndex, nodeType, nextNode} = this._findNodeToInsert({childNodes: childDiv.childNodes, ch})
    const {headId, tailId} = IdManager.generateIdFor({type: key})
    const className = headId.split('-')[1]
    const startNode = $(`<span class="${className}" type="CONTAINER"><span type="HEAD" class="${className}" id="${headId}" value="@${key}{" pairId="${tailId}" >@${key}{</span> </span>`)[0]
    //const midNode = document.createTextNode(' ')
    const endNode = $(`<span type="TAIL" class="${className}" id="${tailId}" pairId="${headId}" value="}" >}</span>`)[0]
    if (nodeType === "#text") {
      const textOfNode = reNode.textContent
      reNode.textContent = textOfNode.slice(0, reIndex - key.length - 2)
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

  beforeTextChangeMultiple (fn) {
    this.emitter.on('before-text-change-multiple', changes => fn(changes))
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

  _getNodeList ({from, to, childNodes}) {

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
    this.editorBody.addEventListener('paste', (e) => {
      const selection = this.getSelection()
      e.preventDefault()
      if (selection.type === 'SINGLE_SELECTION') {
        const text = e.clipboardData.getData('text/plain')
        this.emitter.emit('before-paste-text', {text, node: selection.node, complete: () => { document.execCommand('insertHTML', false, text) }})
      }
    })

    this.editorBody.addEventListener('copy', e => {
      const selection = this.getSelection()
      if (selection.type === 'MULTIPLE_SELECTION') {
        const copyText = this.getSelectionText(selection)
      }
    })

    $(this.editorBody).keydown(e => {
      let {key, ctrlKey} = e
      if (!ctrlKey) {
        const selection = this.getSelection()
        if (selection.type === 'SINGLE_SELECTION') {
          const changes = {}
          changes.key = key
          changes.node = selection.node
          changes.event = e
          changes.selection = selection
          if (key === 'Tab') {
            changes.key = '\t'
            this.emitter.emit('before-text-change', changes)
            return
          }
          if (key === 'Enter' || key === 'Backspace' || key.length === 1) {
            this.emitter.emit('before-text-change', changes)
            return
          }
        } else {
          if (!ctrlKey) {
            const {text, nodeList} = this.getSelectionText(selection)
            this.emitter.emit('before-text-change-multiple', {key, event: e, text, nodeList})
          } else {
            e.preventDefault()
          }
        }
      }
    })

    $(this.editorBody).keyup(e => {
      //console.log(HtmlGenrator.generateFrom(this.getFullText()))
      const {key, ctrlKey} = e
      if (!ctrlKey) {
        if (key === 'Enter') {
          this._correctLineNumber()
          const selection = this.getSelection()
          this.emitter.emit('text-change', {type: 'NEWLINE'})
        } else if (key === 'Backspace') {
          this._correctLineNumber()
          const selection = this.getSelection()
          this.emitter
          .emit('text-change', {type: 'REMOVE-LINE'})
        } else {
          if (key.length > 1) {
            this.emitter.emit('selection-change', this.getSelection())
          } else {
            this.emitter.emit('text-change', {type: 'INSERT', inserted: key})
          }
        }
      } else {
        this.emitter.emit('selection-change', this.getSelection())
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
    if (head === this.headNode || tail === this.tailNode) return this
    this.reset()
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
    console.log(changes)
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
    const {key, node, event, selection} = changes
    console.log(node)
    if (key === 'Backspace') {
      if (node.nodeName === 'SPAN') {
        if (node.getAttribute('type') === 'TAIL') {
          const nodeSelection = editor.getNodeSelection()
          if (nodeSelection.ch === node.getAttribute('value').length) { // not remove line
            event.preventDefault()
            editor.removeHighlight(node)
          } else if (nodeSelection.ch === 0) {
            if (!node.previousSibling) {
              event.preventDefault()
              const parentDiv = node.parentNode
              const previousParent = parentDiv.previousSibling
              if (previousParent) {
                const childNodes = parentDiv.childNodes
                const ch = previousParent.textContent.length
                childNodes.forEach((node) => $(previousParent).append($(node).clone()))
                parentDiv.parentNode.removeChild(parentDiv)
                editor.setCaretAt({line: selection.startLine - 1, ch})
                EditorState.updateSource('API')
              }
            }
          }
        } else if (node.getAttribute('type') === 'HEAD') {
          const nodeSelection = editor.getNodeSelection()
          if (nodeSelection.ch !== 0) { // not remove line
            event.preventDefault()
            editor.removeHighlight(node)
          }
        }
      }
    } else if (key === 'Enter') {
      if (node.nodeName === 'SPAN') {
        const type = node.getAttribute('type')
        if (type === 'HEAD') {
          const nodeSelection = editor.getNodeSelection()
          const textLength = node.getAttribute('value').length
          if (nodeSelection.ch > 0 && nodeSelection.ch < textLength) {
            event.preventDefault()
          }
        }
      }
    } else {
      if (node.nodeName === 'SPAN') {
        if (node.getAttribute('type') === 'TAIL') {
          const nodeSelection = editor.getNodeSelection()
          if (nodeSelection.ch === 0) {
            event.preventDefault()
            const previousNode = node.previousSibling
            if (previousNode) {
              if (previousNode.getAttribute('class') === node.getAttribute('class') && previousNode.getAttribute('type') === 'CONTAINER') {
                previousNode.textContent += key
              } else {
                editor.addContainerBefore({node, withText: key})
              }
            } else {
              editor.addContainerBefore({node, withText: key})
            }
          } else if (nodeSelection.ch >= node.getAttribute('value').length) {
            event.preventDefault()
            node.textContent = node.getAttribute('value')
            const nextNode = node.nextSibling
            if (key !== ' ') {
              if (nextNode) {
                if (nextNode.nodeName === '#text') {
                  nextNode.textContent = key + nextNode.textContent
                } else {
                  node.parentNode.insertBefore(document.createTextNode(key), nextNode)
                }
              } else {
                node.parentNode.appendChild(document.createTextNode(key))
              }
              const {startLine, startPos} = selection
              editor.setCaretAt({line: startLine, ch: startPos + 1})
              EditorState.updateSource('API')
            } else {
              if (nextNode && nextNode.nodeName === '#text' && nextNode.textContent.length > 0) {
                nextNode.textContent = key + nextNode.textContent
                const {startLine, startPos} = selection
                editor.setCaretAt({line: startLine, ch: startPos + 1})
                EditorState.updateSource('API')
              }
            }
          }
        } else if (node.getAttribute('type') === 'HEAD') {
          const nodeSelection = editor.getNodeSelection()
          event.preventDefault()
          if (nodeSelection.ch === 0) {
            const parentNode = nodeSelection.node.parentNode
            parentNode.parentNode.insertBefore(document.createTextNode(key), parentNode)
            EditorState.updateSource('API')
          }
          else if (nodeSelection.ch < node.getAttribute('value').length) {
            const position = $(node).position()
            const height = $(node).height()
            editor.editorInfo.notify({x: position.left, y: position.top + height, message: 'Cannot insert'})
          } else {
            const nextNode = node.nextSibling
            if (nextNode) {
              nextNode.textContent = key + nextNode.textContent
            } else {
              node.parentNode.appendChild(document.createTextNode(key))
            }
            const {startLine, startPos} = selection
            editor.setCaretAt({line: startLine, ch: startPos + 1})
            EditorState.updateSource('API')
          }
        }
      }
    }
  })
  .beforeTextChangeMultiple (changes => {
    const {nodeList, key, text, event} = changes
    if (nodeList.length === 1) {
      console.log(nodeList)
      if (nodeList[0].type !== 'CONTAINER' && nodeList[0].type !== '#text') {
        event.preventDefault()
      }
    } else {
      const removeList = Dom.isGoodTobeReplaced(nodeList)
      if (removeList) {
        removeList.forEach(className => $(`.${className}`).remove())
      } else {
        event.preventDefault()
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
        else if (node.getAttribute('type') === 'TAIL') {
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
        if (type === 'INSERT') {
          const {inserted, oldValue} = changes
          if (inserted === '{') {
            const {word, nodeType, node, selection} = editor.getCurrentWord()
            if (nodeType === '#text') {
              const match = EditorPaser.anyKeyMatch(word)
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
            const {inserted} = changes
            if (node.getAttribute('type') === 'CONTAINER') {
              if (inserted === '{') {
                const {word, selection} = editor.getCurrentWord()
                const match = EditorPaser.anyKeyMatch(word)
                if (match) {
                  const {startLine, startPos} = selection
                  editor.insertMarkDownNodesWithBreak({line: startLine, ch: startPos, mdType: match, container: node})
                }
              }
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
                if (!node.getAttribute('id')) {
                  node.parentNode.innerHTML = '<br>'
                }
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
