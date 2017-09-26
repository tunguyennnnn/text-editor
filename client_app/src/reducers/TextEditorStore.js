let editorState = {
  mode: 'MODE2'
}
export default function (state = editorState, action) {
  switch (action.type) {
    case 'SWITCH_EDITOR_MODE': {
      editorState = {
        ...editorState,
        mode: action.mode
      }
      return editorState
      break
    }
  }
  return state
}
