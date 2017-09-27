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
