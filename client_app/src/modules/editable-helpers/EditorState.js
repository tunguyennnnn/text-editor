const EditorState = {
  state: {
    source: 'USER',
    domHistory: []
  },
  updateSource (source = 'API') {
    this.state.source = source
  },
  resetSource () {
    this.state.source = 'USER'
  },
  updateDom (dom) {

  }
}

export default EditorState
