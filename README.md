# monaco-jsx-highlighter

[![npm version](https://img.shields.io/npm/v/monaco-jsx-highlighter.svg?style=flat-square)](https://www.npmjs.com/package/monaco-jsx-highlighter)
[![npm downloads](https://img.shields.io/npm/dm/monaco-jsx-highlighter.svg?style=flat-square)](https://www.npmjs.com/package/monaco-jsx-highlighter)

An extensible library to highlight (and comment) JSX syntax in the Monaco Editor
using Babel. It exposes its AST after it does its magic, so you can add your own
syntax-based or custom highlights.

## [LIVE DEMO](https://codesandbox.io/s/monaco-editor-react-with-jsx-highlighting-and-commenting-v1-urce8?file=/src/index.js)

[![Monaco JSX Highlighter demo](https://raw.githubusercontent.com/luminaxster/syntax-highlighter/demo_file/msh_demo.gif?sanitize=true)](https://codesandbox.io/s/monaco-editor-react-with-jsx-highlighting-and-commenting-v1-urce8?file=/src/index.js)

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

// Instantiate the highlighter
const monacoJSXHighlighter = new MonacoJSXHighlighter(
   monaco, babel, traverse, aMonacoEditor()
);
// Activate highlighting (debounceTime default: 100ms)
monacoJSXHighlighter.highlightOnDidChangeModelContent(100);
// Activate JSX commenting
monacoJSXHighlighter.addJSXCommentCommand();

// Done =)

function aMonacoEditor() {
   return monaco.editor.create(
      document.getElementById("editor"), {
         value: 'const AB=<A x={d}><B>{"hello"}</B></A>;',
         language: 'javascript'
      });
}
```

## NL;PR

## New in v2.x

- Minified versions are now <12kB (cjs, es, umd).
- Normal versions are ES2018 compliant.
- Polyfilled versions (>2.0.2-polyfilled) are available for node users below
  8.6, they target node 0.
- Refactored and commented code for those who want to use the highlighting or
  commenting APIs separately.
- All utils and core API are exposed.
- Several defect repairs (no console log pollution or highlight breaking on code
  changes).

### Breaking Changes

- `configureLocToMonacoRange` has been renamed to `configureLoc2Range`.
- `afterHighlight` returns an object containing the ast instead of the ast
  object:

```diff
- afterHighlight(ast)
+ afterHighlight({ast, ...rest})
```

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
+ const babelParse = code => parse(code, {sourceType: "module", plugins: ["jsx"],  errorRecovery: true,});
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

### Advanced Usage

After your have a Monaco JSX Highlighter instance, `monacoJSXHighlighter`:

```js
const defaultOptions = {
   parser: 'babel', // for reference only, only babel is supported right now
   isHighlightGlyph: false, // if JSX elements should decorate the line number gutter
   iShowHover: false, // if JSX types should  tooltip with their type info
   isUseSeparateElementStyles: false, // if opening elements and closing elements have different styling
   // you can pass your own custom APIs, check core/ and utils/ for more details
   monacoEditorManager: null,
   decoratorMapper: null,
   jsxCommenter: null,

};

const monacoJSXHighlighter = new MonacoJSXHighlighter(
   monaco, babel, traverse, monacoEditor, defaultOptions
);
```

The highlight activation
method, `monacoJSXHighlighter.highlightOnDidChangeModelContent(debounceTime: number, afterHighlight: func, ...)`
, accepts a callback among other parameters. The callback `afterHighlight`
passes the AST used to highlight the code as well other inner objects. Passing
parameters and using the disposer function returned by the call are optional.

**Note:** The disposer is always called when the editor is disposed.

```js
// Optional: Disable highlighting when needed (e.g. toggling, unmounting, pausing)
const highlighterDisposeFunc = monacoJSXHighlighter.highlightOnDidChangeModelContent(
   100,
   ast => {}
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
   {
      decoratorMapper,
      options,
      ast, // the ast generate by  Babel
      jsxExpressions
   }
) => {
   //... your customization code, check Babel for more info about AST types
};

monacoJSXHighlighter.highlightCode( // defaults
   afterHighlight, // ast => ast,
   onHighlightError, // error => error,
   getAstPromise, // this.getAstPromise,
   onGetAstErrors, // error => error,
);
```

#### Replacing CSS classes with your own

```js
import {JSXTypes} from 'monaco-jsx-highlighter';
// JSXTypes:JSX Syntax types and their CSS classnames.
// Customize the color font in JSX texts:  .myCustomCSS {color: red;}
JSXTypes.JSXText.options.inlineClassName = "myCustomCSS";
```

#### Overriding CSS classes

Take a look of
the [`src/JSXColoringProvider.css` file](https://github.com/luminaxster/syntax-highlighter/blob/master/src/MonacoJSXHighlighter.css)
and override the CSS classes you need. Make sure to import your customization
CSS files after you import `monaco-jsx-highlighter`.

#### JSX Commenting

Additionally, you can add JSX commenting to your monaco editor with
`monacoJSXHighlighter.addJSXCommentCommand()`:
comments in JSX children will result in `{/*...*/}` instead of `//...`. It
mimics the commenting behavior of
the [WebStorm IDE](https://www.jetbrains.com/webstorm/).

Follow this code to find out other perks:

```js
// Optional: Disable JSX commenting when needed (e.g. toggling, unmounting, pausing)
const commentDisposeFunc = monacoJSXHighlighter.addJSXCommentCommand();
commentDisposeFunc(); // if you need to
```

#### Standalone JSX Commenting

If you only need the commenting feature, try this:

```js
import {makeJSXCommenterBundle} from 'monaco-jsx-highlighter';

const [
   jsxCommenter, monacoEditorManager,
   parseJSXExpressionsPromise, getAstPromise,
   loc2Range, range2Loc
] = makeJSXCommenterBundle(
   monaco, parse, traverse, monacoEditor,
);
const commentDisposeFunc = jsxCommenter.addJSXCommentCommand();
commentDisposeFunc(); // if you need to
```

Works same as before, all other objects are exposed if you need them.

#### Creating Monaco compatible ranges from Babel

```js
import {configureLoc2Range} from 'monaco-jsx-highlighter';
// configureLoc2Range: converts Babel locations to Monaco Ranges
const loc2Range = configureLoc2Range(monaco);
const monacoRange = loc2Range(babelAstNode.loc);
```

### TroubleShooting

If you are using `Next.js` or `@monaco-editor/react`, and you get this error:

```
ReferenceError: document is not defined
```

In the case of  `@monaco-editor/react`, probably you are instantiating the
highlighter before Monaco has finished setting up. Check out
the [live demo](https://codesandbox.io/s/monaco-editor-react-with-jsx-highlighting-and-commenting-v1-urce8?file=/src/index.js)
for more details.

For `Next.js`, perhaps the library is not instantiated in the browser, try:

```js
import dynamic from "next/dynamic";

let jsxHighlighter = null;
const HighlighterComponent = dynamic(() => {
   
   import("monaco-jsx-highlighter").then((allMonacoSyntaxHighlighter) => {
      jsxHighlighter = allMonacoSyntaxHighlighter.default;
      console.log(jsxHighlighter);
   });
   
   return null;
}, {ssr: false});
```
