import * as ActionTypes from '../ActionTypes'
import {preview} from '../actions/previewAction'
import { ajax } from 'rxjs/observable/dom/ajax'

import { Observable } from 'rxjs/Observable'

export default function parseArticle (action$) {
  console.log(action$)
  return action$.ofType(ActionTypes.PARSE_ARTICLES)
    .map(action => {
      console.log(action)
      return 1
    })

}
