
/// table
function table (header, body) {
  return `<table>\n
            <thead>\n
              ${header}
            </thead>\n
            <tbody>\n
              ${body}
            <tbody>\n
          </table>\n`
}

function tableRow (content) {
  return `<tr>\n
            ${content}
          </tr>\n`
}

function tableCell (content, flags) {
  const type = flags.header ? 'th' : 'td'
  const tag = flag.align
    ? `<${type} style="text-align: ${flag.align}">${content}`
    : `<${type}>`
  return tag + content + `</${type}>`
}

///// strong
function strong (content) {
  return `<strong>${content}</strong>`
}


/// emphasis
function emphasis (content) {
  return `<em>${content}</em>`
}


/// parse


function parse (text) {

}
