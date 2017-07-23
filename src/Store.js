import { createStore, combineReducers, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'
import {browserHistory} from 'react-router'
import { routerMiddleware, push } from 'react-router-redux'
import AllReducers from './reducers/AllReducers'

const middleware = routerMiddleware(browserHistory)

const store = createStore(
  AllReducers,
  applyMiddleware(routerMiddleware(browserHistory), thunk)
)

export default store
