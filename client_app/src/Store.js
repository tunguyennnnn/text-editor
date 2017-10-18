import { createStore, applyMiddleware, compose } from 'redux'
import { createEpicMiddleware } from 'redux-observable'
import thunk from 'redux-thunk'
import rootEpics from './epics'
import {browserHistory} from 'react-router'
import { routerMiddleware } from 'react-router-redux'
import rootReducer from './reducers/AllReducers'

const epicMiddleware = createEpicMiddleware(rootEpics)

const store = createStore(
  rootReducer,
  applyMiddleware(epicMiddleware)
)

export default function configureStore (initialState) {
  const routingMiddleware = routerMiddleware(browserHistory)
  let enhancer = {}
  if (process.env.NODE_ENV === 'production') {
    enhancer = compose(
        applyMiddleware(
          epicMiddleware,
          thunk,
          routingMiddleware
        )
      )
  } else {
    enhancer = compose(
        applyMiddleware(epicMiddleware, thunk, routingMiddleware),
      )
  }
  return createStore(
    rootReducer,
    initialState,
    enhancer
  )
}
