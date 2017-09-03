const docIds = {}

function generateUniqueId (type) {
  const now = Date.now()
  const newId = `${type}-${Date.now()}`
  return docIds[newId] ? generateUniqueId(type) : {headId: newId, tailId: `close-${now}`}
}

export function generateIdFor ({type}) {
  const {headId, tailId} = generateUniqueId(type)
  docIds[headId] = tailId
  docIds[tailId] = headId
  return {headId, tailId}
}
