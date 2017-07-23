import {combineReducers} from 'redux'
import TextEditorStore from './TextEditorStore'
import PreviewStore from './PreviewStore'

const allReducers = combineReducers({
  textEditor: TextEditorStore,
  previewText: PreviewStore
})

export default allReducers
