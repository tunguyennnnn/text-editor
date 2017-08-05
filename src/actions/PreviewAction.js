export function preview (textLines) {
  return {
    type: 'UPDATE_TEXT',
    textLines
  }
}

export function switchToCommandTool () {
  return {
    type: 'SHOW_COMMAND_TOOL'
  }
}

export function hideCommandTool () {
  return {
    type: 'HIDE_COMMAND_TOOL'
  }
}
