import React from 'react'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'

import MarkDownEditor from './text-editor/markdown'
import WysiwugEditor from './text-editor/wysiwug'
import * as editorActions from './text-editor/actions'

@connect((store) => ({
  editorStore: store.editorStore
}),
  {
    ...editorActions
  }
)

export default class WritingPage extends React.Component {
  render () {
    // store
    const {mode, value} = this.props.editorStore
    // actions
    const {switchEditorModeTo, saveChange} = this.props
    return (
      <div>
        <div>
          <button onClick={switchEditorModeTo.bind(null, 'wysiwug')}>wysiwug</button>
          <button onClick={switchEditorModeTo.bind(null, 'markdown')}>markdown</button>
        </div>
        <div>
          {mode === 'wysiwug'
            ? <WysiwugEditor value={value} saveChange={saveChange} />
            : <MarkDownEditor value={value} saveChange={saveChange} />
          }
        </div>
      </div>
    )
  }
}
