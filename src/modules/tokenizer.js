const katex = require('katex')
const _ = require('lodash')

function InputStream(input) {
  var pos = 0, line = 1, col = 0;
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

    "print": "print",
    "p"    : "print",

    "img-s": "image-small",
    "i-s"  : "image-small",
    "img-m": "image-medium",
    "i-m"  : "image-medium",
    "img-l": "image-large",
    "i-l"  : "image-large",

    "table": "table",
    "tb"   : "table",
    "cell" : "cell",
    "c"    : "cell",

    "unordered-list": "unordered-list",
    "ul"            : "unordered-list",
    "ordered-list"  : "ordered-list",
    "ol"            : "ordered-list",

    "item": "list-item",
    "it"  : "list-item",

    "definition-list": "definition-list",
    "dl"             : "definition-list",

    "html": "html",

    "space": "space",
    "sp"   : "space",

    "newline": "newline",
    "nl"     : "newline",

    "center": "center",
    "ct"    : "center",

    "note": "note",
    "n"   : "note",

    "self-note": "self-note",
    "sn"       : "self-note",

    "size": "size",
    "s"   : "size",

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

    "put": "replace",

    "title": "title"
  }
  var current = null;
  return {
    next: next,
    peek: peek,
    eof: eof,
    croak: input.croak
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

  function process_whitespace(whitespace) {
    // >= 2 newlines equal 2 newlines, >= 2 spaces equal single space
    if ((whitespace.split("\n").length - 1)  >= 2) return "\n\n";
    else if (whitespace.indexOf("\n") >= 0) return "\n";
    return " ";
  }

  function read_whitespace() {
    return {
      type: "whitespace",
      value: process_whitespace(read_while(is_whitespace))
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
    while(!input.eof()){
      var ch = input.next();
      if (!mathopen) {
        if (is_whitespace(ch)) continue;
        if (ch == "$") {mathopen = true; continue;}
        math += ch;
        break;
      }
      if (!mathclose) {
        if (ch == "$") {mathclose = true; continue;}
        math += ch;
        continue;
      }
      if (ch == "}") {closing = true; break;}
      if (is_not_whitespace(ch)) break;
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
    if (is_whitespace(ch)) return read_whitespace();
    if (ch == "@") return maybe_markup();
    if (ch == "`") return read_escaped();
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
  'math-block': (values) => '<span>' + katex.renderToString(values) + '</span>',
  'math-sequence': (values) => {
    return `<span>${generateHtmlWith(values)}</span>`
  },
  'math': (values) => {
    return katex.renderToString(values)
  },
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
  console.log(tokens)
  const html = generateHtmlWith(tokens)
  console.log(html)
  return html
}

export default translate
