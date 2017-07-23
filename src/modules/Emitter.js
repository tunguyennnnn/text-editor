import EventEmitter from 'eventemitter3'

class Emitter extends EventEmitter {
  constructor () {
    super()
    this.listeners = {}
  }

  emit () {
    super.emit.apply(this, arguments)
  }

  handleDom (event, ...args) {
    (this.listeners[event.type] || []).forEach(({node, handler}) => {
      if (event.target === node) {
        handler(event, ...args)
      }
    })
  }

  listenDom (eventName, node, handler) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = []
    }
    this.listeners[eventName].push({node, handler})
  }
}

export default Emitter
