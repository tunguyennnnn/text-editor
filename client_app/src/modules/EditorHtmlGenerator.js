import {parser} from './tokenizer'
const _ = require('lodash')

function flattenContent (lst) {
  const resList = []
  lst.forEach(el => {
    if (el.constructor.name === 'String') resList.push(el)
    else if (el.type === 'whitespace') {
      resList.push(el)
    } else {
      const {type, value, closing} = el
      if (closing) resList.push(el)
      else {
        resList.push(`@${type}{`)
        resList.push(flattenContent(value))
      }
    }
  })
  return _.flatten(resList)
}

function groupString (list) {
  const resList = []
  let currentString = null
  const flattenList = flattenContent(list)
  flattenList.forEach(el => {
    if (el.constructor.name === 'String') {
      if (currentString) currentString += el
      else currentString = el
    } else {
      if (el.type === 'whitespace') {
        if (el.value === ' ') currentString = currentString ? currentString + ' ' : ' '
        else if (el.value === '\n') {
          if (currentString) resList.push(currentString)
          resList.push('\n')
        }
      } else {
        if (currentString) resList.push(currentString)
        currentString = null
        resList.push(el)
      }
    }
  })
  if (currentString) resList.push(currentString)
  return resList
}

function getInnerText (values) {
  console.log(values)
  return values.map(value => {
    return value.value ? value.value : value
  }).join('')
}

function singleTemplate (values, className) {
  return `<span type='CONTAINER' class='${className}'>
            <span type='HEAD' class='${className}>
            ${getInnerText(values)}
            </span>
          </span>
          <span class='${className}></span>`
}

const HTML_TABLE = {
  title: (values) => {
    const className = Date.now()
    return singleTemplate(values, className)
  },
  sub: (values) => {
    const className = Date.now()
    return `<span> type=''`
  },
  p: (values) => {
    console.log(values)
    if (values.length === 0) return ''
    else {
      const className = Date.now()
      return `<span class="${className}" type="CONTAINER">
                <span class="${className}" type="HEAD">@p{</span>
                ${values}
              </span>
              <span class="${className}" type="TAIL">}</span>`
    }
  },
  bold: (values) => {
    const className = Date.now()
    const htmlValues = recursiveGen(values, className)
    console.log(htmlValues)
    const first = htmlValues[0] || ''
    return `<span class="${className}" type="CONTAINER"><span class="${className}" type="HEAD">@bold{</span>${first}</span>${htmlValues.slice(1).join('')}<span class="${className}" type="TAIL">}</span>`

  }
}

function recursiveGen (contents, context) {
  const groupList = groupString(contents)
  console.log(groupList)
  return groupList.map((content, i) => {
    if (content.constructor.name === 'String') {
      console.log(content)
      if (content === '\n') return '</div><div>'
      if (context) {
        if (i === 0) return content
        return `<span class="${context}" type="CONTAINER">${content}</span>`
      } else return content
    }
    else {
      const {type, value} = content
      return HTML_TABLE[type](value)
    }
  })
}

export function generateFrom (input) {
  const parseTree = parser(input)
  console.log(parseTree)
  const {container, content} = parseTree
  let title = ''
  if (container.type === 'title') {
    title = HTML_TABLE.title(container.value)
  }
  content.map(c => {
    const {container, content} = c
    const {type, value, closing} = container
    const html = content.map(c => {
      if (c.constructor.name === 'String') return `<div>${c}</div>`
      const {type, value} = c
      if (type === 'whitespace') {
        return '<div></br></div>'
      }
      return `<div>${HTML_TABLE[type](value)}</div>`
    })
    $('#text-editor-preview').children().first().html(html)
  })
}
