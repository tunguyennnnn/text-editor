import 'codemirror/lib/codemirror.css'
import './styles/style.css'
import 'rxjs'
import React from 'react'
import ReactDom from 'react-dom'
import {Router, Route, IndexRoute, hashHistory, browserHistory} from 'react-router'
import {syncHistoryWithStore} from 'react-router-redux'
import {Provider} from 'react-redux'
import Slate from './containers/Slate'
import WritingPage from './containers/WritingPage'
import EditorContainer from './containers/EditorContainer'
import EditorTrial from './containers/EditorTrial'
import configStore from './Store'
const store = configStore()

const app = document.getElementById('app')

ReactDom.render(
  <Provider store={store}>
    <Router history={hashHistory}>
      <Route path='/' component={WritingPage}></Route>
      <Route path='/editor' component={EditorTrial}></Route>
      <Route path='/review' component={EditorContainer}></Route>
    </Router>
  </Provider>
, app)
