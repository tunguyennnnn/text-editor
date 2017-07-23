import 'codemirror/lib/codemirror.css'
import './styles/style.css'
import React from 'react'
import ReactDom from 'react-dom'
import {Router, Route, IndexRoute, hashHistory, browserHistory} from 'react-router'
import {syncHistoryWithStore} from 'react-router-redux'
import {Provider} from 'react-redux'
import Editor from './containers/Editor'
import store from './Store'

const app = document.getElementById('app')

ReactDom.render(
  <Provider store={store}>
    <Router history={hashHistory}>
      <Route path='/' component={Editor}></Route>
    </Router>
  </Provider>
, app)