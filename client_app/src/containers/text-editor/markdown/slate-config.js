import React from 'react'
export const blockGroup = {
  title: {
    render: props => {
      return (
        <div>
          <span class='highlight'>{'title{'}</span>
          {props.children}
          <span class='highlight'>{'}'}</span>
        </div>
      )
    }
  },
  paragraph: {
    render: props => {
      <div style={{backgrund: 'red'}}>
        {props.children}
      </div>
    }
  },
  section: {
    render: props => {
      <div>
        <span class='highlight'>{'section{'}</span>
          {props.children}
        <span class='highlight'>{'}'}</span>
      </div>
    }
  },
  code: {
    render: (props) => (
        <div>
          <pre {...props.attributes} style={{background: '#3f3f3f', color: 'white'}}>
            <code class='javascript'>
              {props.children}
            </code>
          </pre>
        </div>
      )
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
  }
}
