import React from 'react'
const _ = require('lodash')
import Html from 'slate-html-serializer'

function markHotKey (options) {
  const {key, type} = options
  return {
    onKeyDown (event, change) {
      if (!event.metaKey || event.key !== key) return
      event.preventDefault()
      change.toggleMark(type)
      return true
    }
  }
}

function nodeHotKey (options) {
  const {key, type} = options
  return {
    onKeyDown (event, change) {
      if (!event.metaKey || event.key !== key) return
      event.preventDefault()
      change.setBlock(type)
      return true
    }
  }
}

export const blockGroup = {
  paragraph: {
    key: 'p',
    render: (props) => <p>{props.children}</p>,
    serialize: (children) => <p>{children}</p>
  },
  code: {
    key: 'c',
    render: (props) => <pre {...props.attributes}><code>{props.children}</code></pre>,
    serialize: (children) => <pre><code>{children}</code></pre>
  },
  title: {
    key: 'h',
    render: (props) => <h1>{props.children}</h1>,
    serialize: (children) => <h1>{children}</h1>
  },
  section: {
    key: 's',
    render: (props) => <h3>{props.children}</h3>,
    serialize: (children) => <h3>{children}</h3>
  }
}

export const markGroup = {
  bold: {
    key: 'b',
    render: (props) => <strong>{props.children}</strong>,
    serialize: (children) => <strong>{children}</strong>
  },
  italic: {
    key: 'i',
    render: (props) => <em>{props.children}</em>,
    serialize: (children) => <em>{children}</em>
  }
}

export const markPlugins = _.keys(markGroup).map((type) => markHotKey({type, key: markGroup[type].key}))
export const blockPlugins = _.keys(blockGroup).map((type) => nodeHotKey({type, key: blockGroup[type].key}))
/* Serialization */
const rules = [
  {
    deserialize (el, next) {
      if (el.tagName.toLowerCase() === 'p') {
        return {
          kind: 'block',
          type: 'paragraph',
          nodes: next(el.childNodes)
        }
      }
    },
    serialize (object, children) {
      console.log(object.kind)
      switch (object.kind) {
        case 'mark': {
          return markGroup[object.type].serialize(children)
        }
        case 'block': {
          return <p>{children}</p>
        }
        case 'string': {
          return children
        }
      }
    }
  }
]

export const html = new Html({rules})

// schema

export const schema = {
  document: {
    nodes: [
      {type: ['title'], min: 1, max: 1},
      {type: ['paragraph']}
    ]
  }
}
