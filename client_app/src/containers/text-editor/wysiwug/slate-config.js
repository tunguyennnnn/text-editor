import React from 'react'
const _ = require('lodash')
import Html from 'slate-html-serializer'
import { Block, Value } from 'slate'
import isImage from 'is-image'
import isUrl from 'is-url'
import katex from 'katex'
import ReactHtmlParser, { processNodes, convertNodeToElement, htmlparser2 } from 'react-html-parser'
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
    render: (props) => (
        <div>
          <pre {...props.attributes} style={{background: '#3f3f3f', color: 'white'}}>
            <code class='javascript'>
              {props.children}
            </code>
          </pre>
        </div>
      ),
    serialize: (children) => <pre><code>{children}</code></pre>
  },
  title: {
    key: 'h',
    render: (props) => <h1>{props.children}</h1>,
    serialize: (children) => <h1>{children}</h1>
  },
  section: {
    key: 's',
    render: (props) => <h2>{props.children}</h2>,
    serialize: (children) => <h2>{children}</h2>
  },
  math: {
    key: 'm',
    render: (props, focus) => {
      const res = !focus ? ReactHtmlParser(katex.renderToString('c = \\pm\\sqrt{a^2 + b^2}')) : props.children
      return (
        <p class='math-block'>
          <span class='math-block-span'>
            {res}
          </span>
        </p>
      )
    }
  },
  image: {
    key: 'e',
    render: (props) => {
      const { attributes, node, isSelected } = props
      switch (node.type) {
        case 'image': {
          const src = node.data.get('src')
          const className = isSelected ? 'active' : null
          const style = { display: 'block' }
          return (
            <img src={src} className={className} style={style} {...attributes} />
          )
        }
      }
    }
  }
}

export const markGroup = {
  //code:
  comment: {
    render: props => <span style={{ opacity: '0.33' }}>{props.children}</span>
  },
  keyword: {
    render: props => <span style={{ fontWeight: 'bold', color: '#dc322f' }}>{props.children}</span>
  },
  punctuation: {
    render: props => <span style={{ opacity: '0.75' }}>{props.children}</span>
  },
  function: {
    render: props => <span style={{ color: 'red'}}>{props.children}</span>
  },
  bold: {
    key: 'b',
    render: (props) => <strong>{props.children}</strong>,
    serialize: (children) => <strong>{children}</strong>
  },
  italic: {
    key: 'i',
    render: (props) => <em>{props.children}</em>,
    serialize: (children) => <em>{children}</em>
  },
  math: {
    key: 'm',
    render: props => {
      return <span class='highlight-line'>{props.children}</span>
    }
  }
}

export const mapping = {
  b: ['node', 'bold'],
  i: ['node', 'italic'],
  p: ['block', 'paragraph'],
  c: ['block', 'code'],
  t: ['block', 'title'],
  s: ['block', 'section'],
  m: ['block', 'math']
}
export const markPlugins = _.keys(markGroup).map((type) => markHotKey({type, key: markGroup[type].key}))
export const blockPlugins = _.keys(blockGroup).map((type) => nodeHotKey({type, key: blockGroup[type].key}))

export function plugin () {
  return {
    onKeyDown (event, change) {
      console.log(event)
    }
  }
}

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
      { types: ['title'], min: 1, max: 1 },
      { types: ['paragraph', 'section', 'code', 'image', 'math'], min: 5 }
    ],
    last: {type: ['paragraph']},
    normalize: (change, reason, { node, child, index }) => {
      console.log(reason, child, child, index)
      switch (reason) {
        case 'child_type_invalid': {
          return change.setNodeByKey(child.key, index === 0 ? 'title' : 'paragraph')
        }
        case 'child_required': {
          const block = Block.create(index === 0 ? 'title' : 'paragraph')
          return change.insertNodeByKey(node.key, index, block)
        }
      }
    }
  }
}
