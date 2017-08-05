let commandState = {
  show: false,
  history: []
}

export default function (state = commandState, action) {
  switch (action.type) {
    case 'SHOW_COMMAND_TOOL': {
      return {
        ...commandState,
        show: true
      }
      break
    }
    case 'HIDE_COMMAND_TOOL': {
      commandState.show = false
      return {
        ...commandState,
        show: false
      }
      break
    }
  }
  return state
}
