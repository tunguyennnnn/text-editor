let previewText = []

export default function (state = previewText, action) {
  switch (action.type) {
    case 'UPDATE_TEXT': {
      console.log(action.textLines)
      return action.textLines
      break
    }
  }
  return state
}
