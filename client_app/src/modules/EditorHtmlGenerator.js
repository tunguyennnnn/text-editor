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
  console.log(flattenList)
  flattenList.forEach(el => {
    if (el.constructor.name === 'String') {
      if (currentString) currentString += el
      else currentString = el
    } else {
      if (el.type === 'whitespace') {
        if (el.value === ' ') currentString = currentString ? currentString + ' ' : ' '
        else if (el.value === '\n') {
          if (currentString) {
            resList.push(currentString)
            currentString = null
          }
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
  return values.map(value => {
    return value.value ? value.value : value
  }).join('')
}

function singleTemplate (values, className) {
  return [`<span type='HEAD' class='${className}>`,
          getInnerText(values),
          `</span>`].join('')
}

const HTML_TABLE = {
  title: (values) => {
    const className = Date.now()
    return '<div>' + singleTemplate(values, className) + '</div>'
  },
  sub: (values) => {
    const className = Date.now()
    return `<span> type=''`
  },
  p: (values) => {
    if (values.length === 0) return ''
    else {
      const className = Date.now()
      return [`<span class="${className}" type="HEAD">@p{</span>`,
              getTextOf(values),
              `<span class="${className}" type="TAIL">}</span>`].join('')
    }
  },
  bold: (values) => {
    const className = Date.now()
    const htmlValues = recursiveGen(values, className)
    const first = htmlValues[0] || ''
    return `<span class="${className}" id="bold-${className}" pairId="close-${className}" type="HEAD">@bold{</span>${first}${htmlValues.slice(1).join('')}<span id="close-${className}" pairId="bold-${className}" class="${className}" type="TAIL">}</span>`

  }
}

function recursiveGen (contents, context) {
  const groupList = groupString(contents)
  console.log(groupList)
  return groupList.map((content, i) => {
    if (content.constructor.name === 'String') {
      if (content === '\n') return '</div><div>'
      return content
      // if (context) {
      //   if (i === 0) return content
      //   return `<span class="${context}" type="CONTAINER">${content}</span>`
      // } else return content
    }
    else {
      const {type, value} = content
      return HTML_TABLE[type](value)
    }
  })
}

function getTextOf (value) {
  return value.map(v => {
    if (v.type) {
      if (v.type === 'whitespace') {
        return v.value === '\n' ? '</div><div>' : ' '
      } else {
        return getTextOf(v.value)
      }
    } else {
      return v
    }
  })
}

function generateP (p, content) {
  const {value} = p
  let pHtml = ''
  if (value.length !== 0) {
    pHtml = HTML_TABLE['p'](value)
  }
  const contentHtml = content.map(c => {
    console.log(c)
    if (!c.type) return c
    else {
      if (c.type === 'whitespace') {
        return c.value === '\n' ? '</div><div>' : ' '
      } else {
        return HTML_TABLE[c.type](c.value)
      }
    }
  })
  return '<div>' + pHtml + contentHtml + '</div>'
}


export function generateFrom (input) {
  //console.log(input)
  const parseTree = parser(input)
  const {container, content} = parseTree
  let title = ''
  if (container.type === 'title') {
    title = HTML_TABLE.title(container.value)
  }
  const contentHtml = content.map(c => {
    console.log(c)
    switch (c.container.type) {
      case 'p': {
        return generateP(c.container, c.content)
      }
      default:
        return ''
    }
  })
  // console.log(content)
  // const contentHtml = content.map(c => {
  //   const {content} = c
  //   const html = content.map(c => {
  //     console.log(c)
  //     if (c.constructor.name === 'String') return `<div>${c}</div>`
  //     const {type, value} = c
  //     if (type === 'whitespace') {
  //       return value
  //     }
  //     return `<div>${HTML_TABLE[type](value)}</div>`
  //   }).join('')
  //   return html
  // }).join('')
  //console.log(contentHtml)

  return title + contentHtml
}
