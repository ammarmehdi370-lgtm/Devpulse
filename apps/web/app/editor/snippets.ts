export interface EditorSnippet {
  label: string;
  detail: string;
  language: "javascript" | "typescript" | "html";
  insertText: string;
}

export const EDITOR_SNIPPETS: EditorSnippet[] = [
  {
    label: "rfc",
    detail: "React function component",
    language: "javascript",
    insertText: [
      "import React from 'react';",
      "",
      "type ${1:Component}Props = {};",
      "",
      "export function ${1:Component}(${2:props}: ${1:Component}Props) {",
      "  return (",
      "    <div>",
      "      $0",
      "    </div>",
      "  );",
      "}",
    ].join("\n"),
  },
  {
    label: "useState",
    detail: "React useState hook",
    language: "javascript",
    insertText:
      "const [${1:value}, set${2:Value}] = React.useState<${3:Type}>(${4:initialValue});$0",
  },
  {
    label: "useEffect",
    detail: "React useEffect hook",
    language: "javascript",
    insertText: [
      "React.useEffect(() => {",
      "  $0",
      "}, [${1:dependencies}]);",
    ].join("\n"),
  },
  {
    label: "html5",
    detail: "HTML boilerplate",
    language: "html",
    insertText: [
      "<!doctype html>",
      '<html lang="en">',
      "  <head>",
      '    <meta charset="UTF-8">',
      '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
      "    <title>${1:Document}</title>",
      "  </head>",
      "  <body>",
      "    $0",
      "  </body>",
      "</html>",
    ].join("\n"),
  },
  {
    label: "clog",
    detail: "Console log",
    language: "javascript",
    insertText: "console.log(${1:value});$0",
  },
  {
    label: "for",
    detail: "For loop",
    language: "javascript",
    insertText: [
      "for (let ${1:index} = 0; ${1:index} < ${2:length}; ${1:index}++) {",
      "  $0",
      "}",
    ].join("\n"),
  },
  {
    label: "afn",
    detail: "Async function",
    language: "javascript",
    insertText: ["async function ${1:name}(${2:args}) {", "  $0", "}"].join(
      "\n",
    ),
  },
];

export const getSnippetsForLanguage = (language: string) =>
  EDITOR_SNIPPETS.filter(
    (snippet) =>
      snippet.language === language ||
      (language === "typescript" && snippet.language === "javascript"),
  );
