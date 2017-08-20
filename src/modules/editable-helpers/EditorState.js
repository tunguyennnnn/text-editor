const EditorState = {
  textState: {
    type: null,
    oldValue: '',
    inserted: null
  },
  selectionState: {},
  updateTextState ({type, oldValue, inserted}) {
    this.state = {type, oldValue, inserted}
  },
  updateSelectionState (state) {
    this.selectionState = state
  }
}

export default EditorState
