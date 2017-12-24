import {combineReducers} from 'redux'
import editorReducer from './containers/text-editor/editor.reducer'
const allReducers = combineReducers({
  editorStore: editorReducer
})

export default allReducers
