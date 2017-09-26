const katex = require('katex')
const _ = require('lodash')

function InputStream(input) {
  var pos = 0;
  return {
    next: next,
    peek: peek,
    eof: eof,
  };
  function next() {
    return input.charAt(pos++);
  }
  function peek() {
    return input.charAt(pos);
  }
  function eof() {
    return peek() == "";
  }
}

function TokenStream(input) {
  var markup_command = {
    // text markup
    "bold": "bold",
    "b"   : "bold",

    "italic": "italic",
    "i"     : "italic",

    "highlight": "highlight",
    "h"        : "highlight",

    "note": "note",
    "n"   : "note",

    "self-note": "self-note",
    "sn"       : "self-note",

    "size": "size",
    "s"   : "size",

    // doc structure
    "title": "title",

    "sec"    : "sec",

    "subsection": "sub",
    "sub"       : "sub",

    "subsubsection": "ssub",
    "ssub"         : "ssub",

    "subsubsubsection": "sssub",
    "sssub"           : "sssub",

    "paragraph": "p",
    "p"        : "p",

    // other elements
    "code": "code",
    "c"   : "code",

    "code-bl": "code-block",
    "c-bl"   : "code-block",

    "display": "display",
    "d"      : "display",

    "img-s": "image-small",
    "i-s"  : "image-small",
    "img-m": "image-medium",
    "i-m"  : "image-medium",
    "img-l": "image-large",
    "i-l"  : "image-large",

    "table": "table",
    "tb"   : "table",
    "cell" : "tb-cell",
    "c"    : "tb-cell",

    "unordered-list": "unordered-list",
    "ul"            : "unordered-list",
    "ordered-list"  : "ordered-list",
    "ol"            : "ordered-list",

    "item": "list-item",
    "it"  : "list-item",

    "definition-list": "definition-list",
    "dl"             : "definition-list",

    "space": "space",
    "sp"   : "space",

    "newline": "newline",
    "nl"     : "newline",

    "center": "center",
    "ct"    : "center",

    "math" : "math",
    "m"    : "math",
    "m-seq": "math-sequence",

    "math-block": "math-block",
    "m-bl"      : "math-block",
    "mbl-seq"   : "math-sequence-block",

    "identifier": "identifier",
    "id"        : "identifier",

    "reference": "reference",
    "ref"      : "reference",

    "eval": "eval",
    "e"   : "e"
  }
  var current = null;
  return {
    next: next,
    peek: peek,
    eof: eof
  }
  function is_markup_char(str) {
    return /[a-z0-9-:]/.test(str);
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

  function is_legal_markup(name, params) {
    if ("tb table".indexOf(name) >= 0) {
      return params.slice(0,2).every(str => /[1-9]/.test(str));
    }
    return markup_command.hasOwnProperty(name);
  }

  function read_math(mk_command, mc_params) {
    var math = "", mathopen = false, mathclose = false, closing = false;
    while (!input.eof()) {
      var ch = input.next();
      if (!mathopen) {
        if (ch == "$") mathopen = true;
        else if (!is_whitespace(ch)) break;
      } else if (!mathclose) {
          if (ch == "$") mathclose = true;
          else math += ch;
      } else {
        if (ch == "}") closing = true;
        if (is_not_whitespace(ch)) break;
      }
    }
    return {
      type: mk_command,
      params: mc_params,
      mathopen: mathopen,
      mathclose: mathclose,
      value: math,
      closing: closing
    }
  }

  function maybe_markup() {
    var mc_name, mk_command, mc_params = [], mc_content = [];
    var sofar = input.next();
    var mc = read_while(is_markup_char);
    sofar += mc;
    mc = mc.split(":");
    mc_name = mc[0], mc_params = mc.slice(1);
    if (!mc || input.peek() != "{" || !is_legal_markup(mc_name, mc_params)) {
      return sofar;
    }
    input.next();
    mk_command = markup_command[mc_name];
    if ("math-block".indexOf(mk_command) >= 0) {
      return read_math(mk_command, mc_params);
    }
    mc_content = read_until_matching("}");
    return {
      type: mk_command,
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
    if (!ch) return null
    if (is_whitespace(ch)) return read_whitespace();
    if (ch == "@") return maybe_markup();
    if (ch == "`") return read_escaped();
    return read_text(in_markup);
  }

  function peek() {
    return current || (current = read_next());
  }
  function next() {
    var tok = current
    current = null
    return tok || read_next(false);
  }
  function eof() {
    return peek() == null;
  }
}

const POSSILE_ELEMENTS = {
  "no-title"  : ["p", "sssub", "ssub", "sub", "sec"],
  "title"     : ["p", "sssub", "ssub", "sub", "sec"],
  "sec"       : ["p", "sssub", "ssub", "sub"],
  "sub"       : ["p", "sssub", "ssub"],
  "ssub"      : ["p", "sssub"],
  "sssub"     : ["p"],
}

function parse (input) {
  return parse_document()

  function is_element (tok) {
    return POSSILE_ELEMENTS['title'].includes(tok.type)
  }

  function into_paragraph () {
    var text = [];
    while (!input.eof() && !is_element(input.peek())) text.push(input.next());
    return {
      "container": {
        "type": "p",
        "params": [],
        "value": [],
        "closing": true
      },
      "content": text
    }
  }

  function parse_element(tok_element) {
    var content = [], children = POSSILE_ELEMENTS[tok_element.type];
    while(!input.eof()) {
      var tok = input.peek();
      if (tok.type == "whitespace") {
        if (tok_element.type == "p") content.push(input.next());
        else input.next();
      } else if (children && children.includes(tok.type)) {
        content.push(parse_element(input.next()));
      } else if (is_element(tok)) {
        break;
      } else {
        if (tok_element.type == "p") content.push(input.next());
        else content.push(into_paragraph());
      }
    }
    return {
      container: tok_element,
      content  : content
    }
  }
  function parse_document() {
    while (!input.eof()) {
      var tok = input.peek();
      if (tok.type == "whitespace") {
        input.next()
      }
      if (tok.type == "title") return parse_element(input.next());
      return parse_element({
        "type"  : "no-title",
        "params": [],
        "value" : [],
        "closing": true
      });
    }
  }
}


const HTML_TABLE = {
  'bold': (values) => `<strong>${generateHtmlWith(values)}</strong>`,
  'whitespace': (values) => ' ',
  'italic': (values) => `<em>${generateHtmlWith(values)}</strong>`,
  'math-block': (values) => '<span>' + katex.renderToString(values) + '</span>',
  'math-sequence': (values) => {
    return `<span>${generateHtmlWith(values)}</span>`
  },
  'highlight': (values) => {},
  'note': (values) => {},
  'self-note': (values) => {},
  'math': (values) => {
    return katex.renderToString(values)
  },
  'math-sequence-block': (values) => {},
  'code': (values) => `<div class='code-block'>${values.map((value) => value.value ? value.value : value).join('')}</div>`,
  'code-block': () => {},
  'display': (values) => {},
  'image-small': (values) => {},
  'image-medium': (values) => {},
  'image-large': (values) => {},
  'newline': (values) => {},
  'center': (values) => {},
  'table': (values) => {
    const tableRows = generateTableRows(values)
    let html = ''
    _.forOwn(tableRows, (rowTokens) => {
      html += `<tr>${generateHtmlWith(rowTokens)}</tr>`
    })
    return '<table>' + html + '</table>'
  },
  'table-cell': (values) => `<td>${generateHtmlWith(values)}</td>`,
  'unordered-list': (values) => `<ul>${generateHtmlWith(values.filter((value) => value.type === 'list-item'))}</ul>`,
  'ordered-list': (values) => `<ol>${generateHtmlWith(values.filter((value) => value.type === 'list-item'))}</ol>`,
  'definition-list': () => {},
  'list-item': (values) => `<li>${generateHtmlWith(values)}</li>`,
  'title': (values) => `<h3>${generateHtmlWith(values)}</h3>`,
  'eval': (values) => {},
  'reference': (values) => {},
  'identifier': (values) => {},
  'p': (values) => `<strong>${generateHtmlWith(values)}</strong>`
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

const CONTAINER_TABLE = {
  'p': (values, content) => {
    return `<p><strong>${generateHtmlWith(values)}</strong>${generateHtmlWith(content)}</p>`
  },
  'sec': (values, content) => {
    return `<div>
              <h2>${generateHtmlWith(values)}</h2>
              ${content.map((subcontent) => generateContainer(subcontent)).join('<br>')}
            </div>`
  },
  'sub': (value, content) => {
    return `<div>
              <h3>${value}</h3>
              ${content.map((subcontent) => generateContainer(subcontent)).join('<br>')}
            </div>`
  },
  'ssub': (values, content) => {
    return `<div>
              <h4>${generateHtmlWith(values)}</h4>
              ${content.map((subcontent) => generateContainer(subcontent)).join('<br>')}
            </div>`
  },
  'sssub': (values, content) => {
    return `<div>
              <h5>${generateHtmlWith(values)}</h5>
              ${content.map((subcontent) => generateContainer(subcontent)).join('')}
            </div>`
  },
  'title': (values, content) => {
    return `<div>
              <h1>${generateHtmlWith(values)}</h1>
              ${content.map((subcontent) => generateContainer(subcontent)).join('')}
            </div>`
  },
  'no-title': (values, content) => {
    return `<div>
              ${content.map((subcontent) => generateContainer(subcontent)).join('')}
            </div>`
  }
}

function generateContainer (object) {
  const {container, content} = object
  const {type, value} = container
  return CONTAINER_TABLE[type](value, content)
}

function translate (input) {
  if (/^\n+$/.test(input)) {
    return '<div></div>'
  } else {
    const parsedTree = parse(TokenStream(InputStream(input)))
    window.tree = parsedTree
    console.log(JSON.stringify(parsedTree))
    return generateContainer(parsedTree)
  }
}

export default translate
