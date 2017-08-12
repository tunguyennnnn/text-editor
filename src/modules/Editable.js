function addLines({container, numberOfLines}) {

}

export default class Editable {
  constructor (container, options = {}) {
    // internal objects
    this.options = options
    this._active = false

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
        const line = this._getLineNumberOf(startContainer.parentNode)
        return {type: 'SINGLE_SELECTION', startLine: line, startPos: startOffset, endLine: line, endPos: startOffset}
      } else {
        const startLine = this._getLineNumberOf(startContainer.parentNode)
        const endLine = this._getLineNumberOf(endContainer.parentNode)
        return {type: 'MULTIPLE_SELECTION', startLine, startPos: startOffset, endLine, endPos: endOffset}
      }
    }
  }

  getNumberOfLine () {
    return this.editorBody.childElementCount
  }

  getFullText () {
    return this.editorBody.textContent
  }

  

  _getLineNumberOf (element) { // 0 based index
    return Number(element.getAttribute('line'))
  }

  _setDefaultLines () {
    const {numberOfLines = 10} = this.options
    $(this.editorBody).html(_.range(0, numberOfLines).map((i) => `<div line="${i}"><br></div>`).join(''))
  }

  _addKeyListener () {
    $(this.editorBody).keyup((e) => {
      console.log(e.key, e)
    })
  }

  _addCaretListener () {
    $(this.editorBody).on('selectstart', (e) => {
      console.log('select start')
      $(document).one('mouseup', (e) => {
        console.log(this.getSelection())
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
