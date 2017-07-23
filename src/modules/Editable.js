const Emitter = require('./Emitter')

class Editable {
  constructor (container) {
    this.container = container
    this.container.classList.add('editor-container')
    this.container.innerHTML = ''
    this.body = document.createElement('div')
    this.body.classList.add('editor-body')
    this.body.classList.add('editor-blank')

    this.emitter = new Emitter()
  }
}
