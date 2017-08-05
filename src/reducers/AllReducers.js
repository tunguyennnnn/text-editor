import {combineReducers} from 'redux'
import TextEditorStore from './TextEditorStore'
import PreviewStore from './PreviewStore'

const allReducers = combineReducers({
  textEditorState: TextEditorStore,
  previewText: PreviewStore
})

export default allReducers
