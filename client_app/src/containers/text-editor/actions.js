import * as AN from './action-name'

export function switchEditorModeTo (mode = 'wysiwug') {
  return {
    type: AN.SWITCH_EDITOR_MODE,
    payload: {
      mode
    }
  }
}

export function saveChange (value) {
  return {
    type: AN.SAVE_CHANGE,
    payload: {
      value
    }
  }
}
