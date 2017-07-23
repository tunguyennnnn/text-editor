let previewText = ''

export default function (state = previewText, action) {
  switch (action.type) {
    case 'UPDATE_TEXT': {
      console.log(action.text)
      return action.text
      break
    }
  }
  return state
}
