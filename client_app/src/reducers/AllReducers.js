import {combineReducers} from 'redux'
import TextEditorStore from './TextEditorStore'
import PreviewStore from './PreviewStore'
import CommandToolStore from './CommandToolStore'
const allReducers = combineReducers({
  textEditorState: TextEditorStore,
  previewText: PreviewStore,
  commandToolState: CommandToolStore
})

export default allReducers
