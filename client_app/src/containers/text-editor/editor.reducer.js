import * as AN from './action-name'
import Plain from 'slate-plain-serializer'

const initialState = {
  mode: 'wysiwug',
  value: Plain.deserialize('')
}

export default function editorReducer (state = initialState, action) {
  switch (action.type) {
    case AN.SWITCH_EDITOR_MODE: {
      return {
        ...state,
        mode: action.payload.mode
      }
    }
    case AN.SAVE_CHANGE: {
      return {
        ...state,
        value: action.payload.value
      }
    }
  }
  return state
}
