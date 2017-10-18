export function preview (textLines) {
  return {
    type: 'UPDATE_TEXT',
    payload: {textLines}
  }
}
