const _ = require('lodash')

const HELPER_STYLE = {
  position: 'absolute',
  background: '#D7D6CF',
  border: 'solid 1px grey',
  display: 'none'
}

const HTML_TEMPLATE =
`<div class="editor-info-container">
  <span id="editor-message">heyhey</span>
</div>`

export default class EditorInfo {
  constructor (ed) {
    this.ed = ed
    this.$container = $(HTML_TEMPLATE)
    this.$container.css(HELPER_STYLE)
    $(this.ed).append(this.$container)
  }

  notify ({x, y, message}) {
    this.$container.css('top', y, 'left', x)
    this.$container.show()
    this.$container.find('#editor-message').text(message)
  }
}
