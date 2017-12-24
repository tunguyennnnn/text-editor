const _ = require('lodash')
const $ = require('jquery')
const EventEmitter = require('eventemitter3')
import EditorState from './editable-helpers/EditorState'
import * as IdManager from './editable-helpers/IdManager'
import * as Dom from './editable-helpers/Dom'
import EditorInfo from './editable-helpers/EditorInfo'
import * as EditorPaser from './editable-helpers/EditorParser'
import * as HtmlGenrator from './EditorHtmlGenerator'
import Rx from 'rxjs'

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

  rerender (selection = this.getSelection()) {
    const {startLine, startPos} = selection
    const text = this.getFullText()
    const textLines = text.split('\n').map((line, i) => {
      return {line, index: i}
    }).filter(o => o.line.length !== 0)
    if (textLines.length > 0) {
      const startIndex = textLines[0].index
      const endIndex = textLines[textLines.length - 1].index
      let newHtml = HtmlGenrator.generateFrom(textLines.map(o => o.line).join('\n'))
      newHtml = _.range(0, startIndex).map(n => '<div><br></div>').join('') + newHtml + _.range(0, 5).map(n => '<div><br></div>').join('')
      this.editorBody.innerHTML = newHtml
      this._correctLineNumber()
      this.setCaretAt({line: startLine, ch: startPos})
    }
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
    console.log(line, ch)
    const childDiv = $(this.editorBody).children()[line]
    console.log(childDiv)
    const {reNode, type, chAtNode} = this._findNodeAt({childNodes: childDiv.childNodes, ch})
    console.log(reNode, chAtNode)
    const range = document.createRange()
    const selection = document.getSelection()
    range.setStart(reNode, chAtNode)
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

  insertTextAt ({line, ch, text}) {
    const parentDiv = $(this.editorBody).children()[line]
    const textContent = $(parentDiv).text()
    if (textContent.length < ch) {
      $(parentDiv).text(textContent + text)
    } else {
      $(parentDiv).html(textContent.slice(0, ch) + text + textContent.slice(ch))
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

  _setDefaultLines () {
    const {numberOfLines = 10} = this.options
    $(this.editorBody).html(_.range(0, numberOfLines).map((i) => `<div line="${i}"><br></div>`).join(''))
  }

  _addKeyListener () {
    // this.editorBody.addEventListener('paste', (e) => {
    //   const selection = this.getSelection()
    //   e.preventDefault()
    //   if (selection.type === 'SINGLE_SELECTION') {
    //     const text = e.clipboardData.getData('text/plain')
    //     this.emitter.emit('before-paste-text', {text, node: selection.node, complete: () => { document.execCommand('insertHTML', false, text) }})
    //   }
    // })
    //
    // this.editorBody.addEventListener('copy', e => {
    //   const selection = this.getSelection()
    //   if (selection.type === 'MULTIPLE_SELECTION') {
    //     const copyText = this.getSelectionText(selection)
    //   }
    // })
    //
    // $(this.editorBody).keydown(e => {
    //
    // })
    //
    // $(this.editorBody).keyup(e => {
    //   const {key, ctrlKey} = e
    //   if (!ctrlKey) {
    //     if (key === 'Enter') {
    //       this._correctLineNumber()
    //       const selection = this.getSelection()
    //       this.emitter.emit('text-change', {type: 'NEWLINE'})
    //     } else if (key === 'Backspace') {
    //       this._correctLineNumber()
    //       const selection = this.getSelection()
    //       this.emitter
    //       .emit('text-change', {type: 'REMOVE-LINE'})
    //     } else {
    //       if (key.length > 1) {
    //         this.emitter.emit('selection-change', this.getSelection())
    //       } else {
    //         this.emitter.emit('text-change', {type: 'INSERT', inserted: key})
    //       }
    //     }
    //   } else {
    //     this.emitter.emit('selection-change', this.getSelection())
    //   }
    // })

    const keyObserver = Rx.Observable.fromEvent(this.editorBody, 'keyup')
    const ref = this
    const hotKeyObserver = keyObserver
      .map(e => e.ctrlKey || _.includes(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'], e.key))
      .filter(r => r)
      .debounceTime(500)

    hotKeyObserver
      .filter(r => {
        const selection = this.getSelection()
        return selection.type === 'SINGLE_SELECTION' ? selection : null
      })
      .subscribe({
        next () {
          ref.rerender()
        }
      })

    hotKeyObserver
      .filter(r => {
        const selection = this.getSelection()
        return selection.type !== 'SINGLE_SELECTION' ? selection : null
      })
      .subscribe({
        next () {
          console.log('highlighting')
        }
      })

    keyObserver
      .map(e => e.key === 'Enter' && !e.ctrlKey)
      .filter(r => r)
      .subscribe(r => this._correctLineNumber())

    keyObserver
      .map(e => e.key === 'Backspace' && !e.ctrlKey)
      .filter(r => r)
      .subscribe(r => this._correctLineNumber())

    keyObserver
      .map(e => e.key.length === 1 && !e.ctrlKey ? e.key : null)
      .filter(r => r)
      .subscribe(key => {
        console.log(key)
        if (key === '{') {
          const {word} = this.getCurrentWord()
          const match = EditorPaser.anyKeyMatch(word)
          if (match) {
            const {startLine, startPos} = this.getSelection()
            this.insertTextAt({line: startLine, ch: startPos, text: '}'})
            this.setCaretAt({line: startLine, ch: startPos})
          }
        }
      })


    const keyDownObserver = Rx.Observable.fromEvent(this.editorBody, 'keydown')
    keyDownObserver
      .filter(e => e.key === 'Tab' && !e.ctrlKey)
      .subscribe(e => {
        e.preventDefault()
        const {startLine, startPos} = this.getSelection()
        this.insertTextAt({line: startLine, ch: startPos, text: '&nbsp;&nbsp;'})
        this.setCaretAt({line: startLine, ch: startPos + 2})
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
      }
      i += child.textContent.length
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
    console.log(childNodes, ch)
    let i = 0, reNode, chAtNode = 0
    _.forEach(childNodes, (child, index) => {
      const text = child.textContent
      if (i + text.length >= ch) {
        switch (child.nodeName) {
          case 'BR': {
            reNode = child.parentNode
            return false
          }
          case '#text': {
            reNode = child
            chAtNode = ch - i
            return false
          }
          case 'SPAN': {
            reNode = child.childNodes[0]
            chAtNode = ch - i
            return false
          }
        }
      } else {
        i += text.length
      }
    })
    return {chAtNode, reNode}
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

  // editor.onSelectionChange((changes) => {
  //   console.log(changes)
  //   if (changes.type === 'SINGLE_SELECTION') {
  //     console.log(changes)
  //     editor.rerender(changes)
  //     const {node} = editor.getNodeSelection()
  //     if (node.nodeName === 'SPAN') {
  //       if (node.getAttribute('type') === 'HEAD' || node.getAttribute('type') === 'TAIL') {
  //         const pairId = $(node).attr('pairId')
  //         const pairNode = $(`#${pairId}`).get(0)
  //         highlightManager.set(node, pairNode)
  //       } else {
  //         highlightManager.reset()
  //       }
  //     }
  //   }
  // })
  // .beforeTextChange(changes => {
  //
  // })
  // .onBeforePasteText (changes => {
  //   const {node, text, complete} = changes
  //   complete()
  //   const newHtml = HtmlGenrator.generateFrom(editor.getFullText())
  //   editor.editorBody.innerHTML = newHtml
  // })
  // .onTextChange((changes) => {
  //   const {key, selection} = changes
  //   console.log(editor.getNodeSelection())
  //   if (key === 'Enter') {
  //
  //   } else if (key === 'Backspace') {
  //
  //   } else if (key.length === 1) {
  //     if (key === '{') {
  //       const {word, selection} = editor.getCurrentWord()
  //       const match = EditorPaser.anyKeyMatch(word)
  //       if (match) {
  //         const {startLine, startPos} = selection
  //         editor.insertHtmlAt({line: selection.startLine, ch: selection.startPos, html: '}'})
  //         console.log(startLine, startPos)
  //         editor.setCaretAt({line: startLine, ch: startPos})
  //       }
  //     }
  //   }
    // const {selection} = changes
    // const newHtml = HtmlGenrator.generateFrom(editor.getFullText())
    // console.log(newHtml)
    // editor.editorBody.innerHTML = newHtml
    // console.log(selection)
    // editor.setCaretAt({line: selection.startLine, ch: selection.startPos})
  // })
}
