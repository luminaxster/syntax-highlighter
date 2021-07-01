# monaco-jsx-highlighter
[![npm version](https://img.shields.io/npm/v/monaco-jsx-highlighter.svg?style=flat-square)](https://www.npmjs.com/package/monaco-jsx-highlighter)
[![npm downloads](https://img.shields.io/npm/dm/monaco-jsx-highlighter.svg?style=flat-square)](https://www.npmjs.com/package/monaco-jsx-highlighter)

An extensible library to highlight (and comment) JSX syntax in the Monaco Editor
using Babel. It exposes its AST after it does its magic, so you can add your own
syntax-based or custom highlights.

## [LIVE DEMO](https://codesandbox.io/s/monaco-editor-react-with-jsx-highlighting-and-commenting-v1-urce8?file=/src/index.js)
[![monaco-jsx-highlighter demo](https://github.com/luminaxster/syntax-highlighter/blob/demo_file/msh_demo.gif)](https://codesandbox.io/s/monaco-editor-react-with-jsx-highlighting-and-commenting-v1-urce8?file=/src/index.js)
```sh
# with npm (assuming you are already using monaco-editor)
  npm i @babel/parser @babel/traverse monaco-jsx-highlighter
# with yarn (assuming you are already using monaco-editor)
  yarn add @babel/parser @babel/traverse monaco-jsx-highlighter
```

## TL;DR

```js
import monaco from 'monaco-editor';
import {parse} from "@babel/parser";
import traverse from "@babel/traverse";
import MonacoJSXHighlighter from 'monaco-jsx-highlighter';

// Minimal Babel setup for React JSX parsing:
const babelParse = code => parse(code, {
   sourceType: "module",
   plugins: ["jsx"]
});

// Instantiate the highlighter
const monacoJSXHighlighter = new MonacoJSXHighlighter(
   monaco, babelParse, traverse, getMonacoEditor()
);
// Activate highlighting (debounceTime default: 100ms)
monacoJSXHighlighter.highlightOnDidChangeModelContent(100);
// Activate JSX commenting
monacoJSXHighlighter.addJSXCommentCommand();
// Done =)

function getMonacoEditor(){
  return monaco.editor.create(
          document.getElementById("editor"), {
            value: 'const AB=<A x={d}><B>{"hello"}</B></A>;',
            language: 'javascript'
          });
}
```

## NL;PR

## New in v1.x

- Babel is now used directly instead of via JsCodeShift.
- React fragment, spread child, spread attribute, and container expression
  highlighting.
- highlightOnDidChangeModelContent(debounceTime) method debounces highlight
  updates.
- Several defect repairs.

### Breaking Changes

If you have used 0.x versions, you'll notice JsCodeShift has been replaced with
Babel:

```diff
- import j from 'jscodeshift';
+ import {parse} from "@babel/parser";
+ import traverse from "@babel/traverse";
```

This only affects the constructor signature:

```diff
+ const babelParse = code => parse(code, {sourceType: "module", plugins: ["jsx"]});
 const monacoJSXHighlighter = new MonacoJSXHighlighter(
  monaco,
- j,
+ babelParse, traverse,
  monacoEditor
 );
```

Also, `monacoJSXHighlighter.highlightOnDidChangeModelContent` method now has an
optional debounce time as first parameter on its signature:

```diff
monacoJSXHighlighter.highlightOnDidChangeModelContent(
- afterHighlight: func,
+ debounceTime: number, afterHighlight: func,
 ...)
```

### Dependencies

It requires [`monaco-editor`](https://www.npmjs.com/package/monaco-editor)
, [`@babel/parser`](https://www.npmjs.com/package/@babel/parser)
and [`@babel/traverse`](https://www.npmjs.com/package/@babel/traverse), for
convenience, they are listed as peer dependencies and passed by reference (so
you can do lazy loading). Please install them before `monaco-jsx-highlighter`;

### Installation

Install the package in your project directory with:

#### NPM:
```sh
# with npm
 npm install @babel/parser
 npm install @babel/traverse
 npm install monaco-jsx-highlighter
```
#### YARN:
```sh
# with yarn
 yarn add @babel/parser
 yarn add @babel/traverse
 yarn add monaco-jsx-highlighter
```

### Replacing CSS classes with your own

```js
import {JSXTypes} from 'monaco-jsx-highlighter';
// JSXTypes:JSX Syntax types and their CSS classnames.
// Customize the color font in JSX texts:  .myCustomCSS {color: red;}
JSXTypes.JSXText.options.inlineClassName = "myCustomCSS";
```

### Overriding CSS classes

Take a look of
the [`src/JSXColoringProvider.css` file](https://github.com/luminaxster/syntax-highlighter/blob/master/src/MonacoJSXHighlighter.css)
and override the CSS classes you need. Make sure to import your customization
CSS files after you import `monaco-jsx-highlighter`.

### Advanced Usage
After your have a Monaco JSX Highlighter instance, `monacoJSXHighlighter`:
```js
const defaultOptions = {
  parser: 'babel', // for reference only, only babel is supported right now
  isHighlightGlyph: false, // if JSX elements should decorate the line number gutter
  iShowHover: false, // if JSX types should  tooltip with their type info
  isUseSeparateElementStyles: false, // if opening elements and closing elements have different styling
  isThrowJSXParseErrors: false, // Only JSX Syntax Errors are not thrown by default when parsing, true will throw like any other parsign error
};

const monacoJSXHighlighter = new MonacoJSXHighlighter(
   monaco, babelParse, traverse, monacoEditor, defaultOptions
);
```
The highlight activation method, `monacoJSXHighlighter.highlightOnDidChangeModelContent(debounceTime: number, afterHighlight: func, ...)`
, accepts a callback among other parameters. The callback `afterHighlight`
passes the AST used to highlight the code. Passing parameters and using the disposer function returned by the call are optional.

**Note:** The disposer is always called when the editor is disposed.

```js
// Optional: Disable highlighting when needed (e.g. toggling, unmounting, pausing)
const highlighterDisposeFunc = monacoJSXHighlighter.
   highlightOnDidChangeModelContent(
        100, 
        ast=>{}
   );
highlighterDisposeFunc(); // if you need to

// Internally the highlighter is triggering after each code change debounced
let tid = null;
let debounceTime = 100; // default
monacoEditor.onDidChangeModelContent(() => {
  clearTimeout(tid);
  tid = setTimeout(() => {
            monacoJSXHighlighter.highlightCode();
          },
          debounceTime,
  );
});

// You can do the higlighting directly at anytime
monacoJSXHighlighter.highlightCode();
// or customize its behavior by adding custom highlighting after the JSX highlighting
const afterHighlight = (
        ast // the ast generate by  Babel
) => {
  //... your customization code, check Babel for more info about AST types
  //optional: array with the decorators created by the highlighter, push your decorator ids to this array
  monacoJSXHighlighter.JSXDecoratorIds.push(...yourdecoratorsIds);
};

monacoJSXHighlighter.highlightCode(
        afterHighlight, //default: ast=>ast
        onError, // default: error=>console.error(error)
        getAstPromise, // default:  parse(monacoEditor.getValue())
        onParseErrors, // default: error=>error
);
```

Additionally, you can add JSX commenting to your monaco editor with
`monacoJSXHighlighter.addJSXCommentCommand()`:
comments in JSX children will result in `{/*...*/}` instead of `//...`. It mimics the commenting behavior of
the [WebStorm IDE](https://www.jetbrains.com/webstorm/).

Follow this code to find out other perks:

```js
// Optional: Disable JSX commenting when needed (e.g. toggling, unmounting, pausing)
const commentDisposeFunc = monacoJSXHighlighter.addJSXCommentCommand();
commentDisposeFunc(); // if you need to
```

### Creating Monaco compatible ranges from Babel

```js
import {configureLocToMonacoRange} from 'monaco-jsx-highlighter';
// locToMonacoRange: converts Babel locations to Monaco Ranges
const locToMonacoRange = configureLocToMonacoRange(monaco);
const monacoRange = locToMonacoRange(babelAstNode.loc);
```
