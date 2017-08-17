const EventEmitter = require('eventemitter3')

export default class EditorEmitter extends EventEmitter {
  constructor () {
    super()
    this.listeners = {}
  }
  emit () {
    super.emit.apply(this, arguments)
  }
  handleEvent (event, ...args) {
    (this.listeners[event.type] || []).forEach(({node, handler}) => {
      if (event.target === node || node.contains(event.target)) {
        handler(event, ...args)
      }
    })
  }
  listenEvent (eventName, node, handler) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = []
    }
    this.listeners[eventName].push({node, handler})
  }
}
