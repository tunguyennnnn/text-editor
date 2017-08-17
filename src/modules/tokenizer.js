const _ = require('lodash')
const katex = require('katex')

function InputStream (input) {
  var pos = 0, line = 1, col = 0
  return {
    next: next,
    peek: peek,
    eof: eof,
    croak: croak
  };
  function next() {
    var ch = input.charAt(pos++);
    if (ch == "\n") line++, col = 0; else col++;
    return ch;
  }
  function peek() {
    return input.charAt(pos);
  }
  function eof() {
    return peek() == "";
  }
  function croak(msg) {
    throw new Error(msg + " (" + line + ":" + col + ") ");
  }
}

function TokenStream(input) {
  const markup_command = {
    "bold": "bold-text",
    "b"   : "bold-text",

    "italic": "italic-text",
    "i"     : "italic-text",

    "code": "code-inline",
    "c"   : "code-inline",

    "code-bl": "code-block",
    "c-bl"   : "code-block",

    "img-s": "image-small",
    "i-s"  : "image-small",

    "table": "table",
    "tb"   : "table",
    "cell" : "cell",
    "c"    : "cell",

    "ul"  : "unordered-list",
    "ol"  : "ordered-list",
    "dl"  : "definition-list",
    "item": "list-item",

    "html": "html",

    "space": "space",
    "sp"   : "space",

    "title": "title"
  }
  var current = null;
  return {
    next: next,
    peek: peek,
    eof: eof,
    croak: input.croak
  }
  function is_markup_char(ch) {
    return /[a-z0-9-:]/.test(ch);
  }
  function read_while(pred) {
    var str = "";
    while(!input.eof() && pred(input.peek())) str += input.next();
    return str;
  }
  function is_whitespace(ch){
    return " \t\n".indexOf(ch) >= 0;
  }

  function is_not_whitespace(ch) {
    return !is_whitespace(ch);
  }

  function read_whitespace() {
    return {
      type: "whitespace",
      value: read_while(is_whitespace)
    }
  }

  function read_until_matching(delimiter) {
    var content = [], closing = false;
    while (!input.eof() && input.peek() != delimiter) {
      content.push(read_next(true));
    }
    if (input.peek() == delimiter) closing = true, input.next();
    return {
      content: content,
      closing: closing
    }
  }

  function maybe_markup() {
    var mc_name = null, mc_params = [], mc_content = [];
    var at = input.next(); // the @ sign
    var mc = read_while(is_markup_char); // markup command e.g. bold:id
    if (!mc) return at;
    if (input.peek() != "{") return at + mc;
    input.next();
    mc = mc.split(":");
    mc_name = mc[0], mc_params = mc.slice(1);
    mc_content = read_until_matching("}");
    return {
      type: markup_command[mc_name],
      params: mc_params,
      value: mc_content.content,
      closing: mc_content.closing
    }
  }

  function read_text(in_markup) {
    var text = read_while(function(ch) {
      return ch != "}" && ch != "@" && ch != "`" && is_not_whitespace(ch);
    });
    var ch = input.peek();
    if (ch == "}" && !in_markup) return text + input.next();
    return text;
  }

  function read_escaped() {
    var backtick = input.next();
    if (!input.eof() && is_not_whitespace(input.peek())) return input.next();
    return backtick;
  }

  function read_next(in_markup) {
    if (input.eof()) return null;
    var ch = input.peek();
    if (is_whitespace(ch)) return read_whitespace();
    if (ch == "@") return maybe_markup();
    if (ch == '`') return read_escaped();
    return read_text(in_markup);
  }

  function peek() {
    return current || (current = read_next());
  }
  function next() {
    var tok = current;
    current = null;
    return tok || read_next(false);
  }
  function eof() {
    return peek() == null;
  }
}

const HTML_TABLE = {
  'bold-text': (values) => `<strong>${generateHtmlWith(values)}</strong>`,
  'whitespace': (values) => ' ',
  'italic-text': (values) => `<em>${generateHtmlWith(values)}</strong>`,
  'code-inline': (() => {}),
  'code-block': (() => {}),
  'table': (values) => {
    const tableRows = generateTableRows(values)
    let html = ''
    _.forOwn(tableRows, (rowTokens) => {
      console.log(rowTokens)
      html += `<tr>${generateHtmlWith(rowTokens)}</tr>`
    })
    return '<table>' + html + '</table>'
  },
  'cell': (values) => `<td>${generateHtmlWith(values)}</td>`,
  'unordered-list': (values) => `<ul>${generateHtmlWith(values.filter((value) => value.type === 'list-item'))}</ul>`,
  'ordered-list': (values) => `<ol>${generateHtmlWith(values.filter((value) => value.type === 'list-item'))}</ol>`,
  'definition-list': (() => {}),
  'list-item': (values) => `<li>${generateHtmlWith(values)}</li>`,
  'title': (values) => `<h3>${generateHtmlWith(values)}</h3>`
}

function generateTableRows (tokens, rowNumber, colNumber) {
  const validTokens = tokens.filter((token) => token.type === 'cell')
  const tableRows = {}
  validTokens.forEach((token) => {
    const [row, col] = token.params
    if (!tableRows[row]) {
      tableRows[row] = []
    }
    tableRows[row].push(token)
  })
  return tableRows
}

function generateHtmlWith (tokens) {
  return tokens.map((token) => {
    if (! token.type) {
      return token
    } else {
      const {type, value, closing} = token
      const func = HTML_TABLE[type]
      return func(value)
    }
  }).join('')
}

function translate (input) {
  const output = TokenStream(InputStream(input))
  const tokens = []
  while (!output.eof()) {
    tokens.push(output.next())
  }
  const html = generateHtmlWith(tokens)
  console.log(tokens)
  console.log(html)
  return html
}

export default translate

// if (typeof process != "undefined") (function(){
//   var code = "";
//   process.stdin.setEncoding("utf8");
//   process.stdin.on("readable", function() {
//     var chunk = process.stdin.read();
//     if (chunk) code += chunk;
//   });
//   process.stdin.on("end", function(){
//     var input = TokenStream(InputStream(code));
//     while (!input.eof()) {
//       console.log("-------------------------");
//       console.log(JSON.stringify((input.next()), null, 2));
//     }
//   });
// })()
