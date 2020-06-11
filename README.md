# monaco-jsx-highlighter

An extensible library to highlight (and comment) JSX syntax in the Monaco Editor using JsCodeShift.
 It exposes its AST, so you can add your own syntax-based or custom highlights.
   
## Example
See it live in a [React app](https://codesandbox.io/s/monaco-editor-react-6o4u4?file=/src/index.js) 

## Dependencies
It requires [`monaco-editor`](https://www.npmjs.com/package/monaco-editor) and [`jscodeshift`](https://www.npmjs.com/package/jscodeshift), for convenience, they are listed as peer dependencies.

## Installation

Install the package in your project directory with:

```sh
// with npm
npm install monaco-jsx-highlighter

// with yarn
yarn add monaco-jsx-highlighter
```

## Usage
The main method, `monacoJSXHighlighter.highLightOnDidChangeModelContent(afterHighlight: func)`,
 accepts a callback, among other parameters.
 The callback `afterHighlight` passes the AST used to highlight the code.
 
 Additionally, you can add JSX commenting to your monaco editor with
 `monacoJSXHighlighter.addJSXCommentCommand()`:
 comments in JSX children will result in `{/*...*/}` instead of `//...`. I tried to mimic the commenting behavior of the [WebStorm IDE](https://www.jetbrains.com/webstorm/).

### TL;DR
```js
import monaco from 'monaco-editor';
import j from 'jscodeshift';
import MonacoJSXHighlighter from 'monaco-jsx-highlighter';

const elem = document.getElementById("editor");
const monacoEditor = monaco.editor.create(elem, {
    value: 'const AB=<A x={d}><B>{"hello"}</B></A>;',
    language: 'javascript'
});
// Instantiate the highlighter
const monacoJSXHighlighter = new MonacoJSXHighlighter(monaco, j, monacoEditor);
// Enable highlighting
const highlighterDisposeFunc =monacoJSXHighlighter.highLightOnDidChangeModelContent();
// Optional: Disable highlighting when needed (e.g. toggling, unmounting, pausing)
highlighterDisposeFunc();

const commentDisposeFunc =monacoJSXHighlighter.addJSXCommentCommand();
// Optional: Disable JSX commenting when needed (e.g. toggling, unmounting, pausing)
commentDisposeFunc();
```
### NL;PR

```js
// You can call it directly at anytime
monacoJSXHighlighter.highlightCode();
// Internally the highlighter is triggering after each code change
monacoEditor.onDidChangeModelContent(() => {
monacoJSXHighlighter.highlightCode();
});

// You can change hover or glyphs behaviors
const defaultOptions = {
    isHighlightGlyph: true,
    iShowHover: false,
    isUseSeparateElementStyles: true,
};

const monacoJSXHighlighter = new MonacoJSXHighlighter(monaco, j, monacoEditor, defaultOptions);

// Adding custom highlighting after the JSX highlighting
const afterHighlight =(
                ast // the ast generate by  JsCodeShift
)=>{
    //... your customization code, check jscodeshift for mor infoe ont he ast

    //optional: array with the decorators created by the highlighter, push your decorator ids to this array
    monacoJSXHighlighter.JSXDecoratorIds.push(...yourdecoratorsIds); 
};

monacoJSXHighlighter.highlightCode(
     afterHighlight, //default: ast=>ast
     onError, // default: error=>console.error(error)
     getAstPromise, // default:  j(monacoEditor.getValue())
     onJsCodeShiftErrors, // default: error=>error
);
```

### Customizing via CSS

#### Replacing css classes with your own
```js
import {JSXTypes} from 'monaco-jsx-highlighter'; 
// JSXTypes:the JSX Syntax types and their monaco CSS classnames.
// Customize the color font in JSX texts (style class .mtk110.glyph.JsxText from one of your css files)
JSXTypes.JSXText.options.inlineClassName = "mtk110.glyph.JsxText";
```

#### Override the classes
Take a look of the [`src/JSXColoringProvider.css` file](https://github.com/luminaxster/syntax-highlighter/blob/master/src/MonacoJSXHighlighter.css) and override the CSS classes you need.
 Make sure to import your customization CSS files after you import `monaco-jsx-highlighter`;

### Creating Monaco compatible ranges from JsCodeShift 
```js
import { configureLocToMonacoRange} from 'monaco-jsx-highlighter'; 
// locToMonacoRange: converts JsCodeShift locations to Monaco Ranges
const locToMonacoRange = configureLocToMonacoRange(monaco);
const monacoRange = locToMonacoRange(jAstNode.val.loc);
```
