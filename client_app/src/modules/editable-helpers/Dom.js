const _ = require('lodash')

export function getNode (node) {
  const type = node.nodeName
  if (type === '#text' || type === 'BR') return node.parentNode
  return node
}

export function getParentOf (node) {
  const type = node.nodeName
  switch (type) {
    case '#text': {
      const parent = node.parentNode
      if (parent.nodeName === 'DIV') return {parent: node, type}
      if (parent.nodeName === 'SPAN') {
        if (parent.getAttribute('type') === 'CONTAINER') {
          return {parent, type: 'CONTAINER'}
        } else if (parent.getAttribute('type') === 'TAIL') {
          return {parent, type: 'TAIL'}
        } else {
          return {parent: parent.parentNode, type: 'HEAD'}
        }
      }
      break
    }
    case 'SPAN': {
      if (node.getAttribute('type') === 'CONTAINER') return {parent: node, type: 'CONTAINER'}
      if (node.getAttribute('type') === 'TAIL') return {parent: node, type: 'TAIL'}
      return {parent: node.parentNode, type: 'HEAD'}
      break
    }
    case 'DIV': {
      return {parent: node, type: 'DIV'}
      break
    }
    case 'BR': {
      return {parent: node.parentNode, type: 'DIV'}
      break
    }
  }
}

export function isGoodTobeReplaced (nodeList) {
  const removeList = []
  const scopeTable = {}
  nodeList.forEach(n => {
    const node = n.parent
    const type = n.type
    //console.log(node, scopeTable)
    if (type !== '#text') {
      if (type === 'HEAD') {
        const attr = node.getAttribute('class')
        scopeTable[attr] = true
      } else if (type === 'TAIL') {
        const attr = node.getAttribute('class')
        if (scopeTable[attr]) {
          delete scopeTable[attr]
          removeList.push(attr)
        } else {
          scopeTable[attr] = true
          return false
        }
      } else if (type === 'CONTAINER') {
        // const attr = node.getAttribute('class')
        // scopeTable[attr] = true
      }
    }
  })
  //console.log(scopeTable)
  if (_.keys(scopeTable).length === 0) {
    return removeList
  }
}
