let monaco = null, parse = null, traverse = null;

const defaultOptions = {
   parser: 'babel',
   isHighlightGlyph: false,
   iShowHover: false,
   isUseSeparateElementStyles: false,
};

export function makeJSXTraverse() {
   const jsxExpressions = [];
   const jsxTraverse = (path) => {
      if (path.type.toUpperCase().includes("JSX")) {
         jsxExpressions.push(path);
      }
   };
   
   const find = (type) => {
      return jsxExpressions.filter(p => p.type === type);
   }
   
   const findJSXElements = () => find('JSXElement');
   
   return {
      jsxExpressions,
      find,
      findJSXElements,
      jsxTraverse
   };
};

function _jsxTraverseAst(ast, _traverse = traverse) {
   const jsxManager = makeJSXTraverse();
   _traverse(ast, {enter: jsxManager.jsxTraverse});
   return jsxManager;
}

export function prepareOptions(
   path,
   jsxTypeOptions = {},
   highlighterOptions = {}
) {
   return highlighterOptions.iShowHover ?
      {...jsxTypeOptions, ...{hoverMessage: `(${path.type})`}}
      : jsxTypeOptions;
}

export const HIGHLIGHT_TYPE = {
   ALL: 'ALL', // the whole node's location
   IDENTIFIER: 'IDENTIFIER', // look for JSX identifiers within node
   EDGE: 'EDGE', // only the  starting and ending character in node's location
   STYLE: 'STYLE', // for styling only, not used by node locations
};

export const HIGHLIGHT_MODE = {
   [HIGHLIGHT_TYPE.ALL]: (
      path,
      jsxTypeOptions,
      decorators = [],
      highlighterOptions,
      locToMonacoRange,
   ) => {
      locToMonacoRange && decorators.push({
         range: locToMonacoRange(path.node.loc),
         options: prepareOptions(path, jsxTypeOptions, highlighterOptions)
      });
      return decorators;
   },
   [HIGHLIGHT_TYPE.IDENTIFIER]: (
      path,
      jsxTypeOptions = {},
      decorators = [],
      highlighterOptions = {},
      locToMonacoRange,
   ) => {
      path.traverse(
         {
            enter: p => {
               if (p.isJSXIdentifier()) {
                  HIGHLIGHT_MODE[HIGHLIGHT_TYPE.ALL](
                     p,
                     jsxTypeOptions,
                     decorators,
                     highlighterOptions,
                     locToMonacoRange,
                  );
               }
            }
         }
      );
      return decorators;
   },
   [HIGHLIGHT_TYPE.EDGE]: (
      path,
      jsxTypeOptions,
      decorators = [],
      highlighterOptions,
      locToMonacoRange,
   ) => {
      const options = prepareOptions(path, jsxTypeOptions, highlighterOptions);
      
      const loc = path.node.loc;
      
      const startEdgeLoc = {start: {...loc.start}, end: {...loc.start}};
      startEdgeLoc.end.column++;
      
      const endEdgeLoc = {start: {...loc.end}, end: {...loc.end}};
      endEdgeLoc.start.column--;
      
      decorators.push({
         range: locToMonacoRange(startEdgeLoc),
         options
      });
      decorators.push({
         range: locToMonacoRange(endEdgeLoc),
         options
      });
      return decorators;
   },
   [HIGHLIGHT_TYPE.STYLE]: () => [], // noop
};

export const JSXTypes = {
   JSXOpeningFragment: {
      highlightScope: HIGHLIGHT_TYPE.ALL,
      options: {
         inlineClassName: 'mtk101.Identifier.JSXOpeningFragment.Bracket',
      },
   },
   JSXClosingFragment: {
      highlightScope: HIGHLIGHT_TYPE.ALL,
      options: {
         inlineClassName: 'mtk102.Identifier.JSXClosingFragment.Bracket',
      },
   },
   JSXText: {
      highlightScope: HIGHLIGHT_TYPE.ALL,
      options: {
         inlineClassName: 'mtk104.JsxElement.JsxText',
      },
   },
   JSXOpeningElement: {
      highlightScope: HIGHLIGHT_TYPE.IDENTIFIER,
      options: {
         inlineClassName: 'mtk101.Identifier.JsxOpeningElement.Identifier',
      },
   },
   JSXClosingElement: {
      highlightScope: HIGHLIGHT_TYPE.IDENTIFIER,
      options: {
         inlineClassName: 'mtk102.Identifier.JsxClosingElement.Identifier ',
      },
   },
   JSXAttribute: {
      highlightScope: HIGHLIGHT_TYPE.IDENTIFIER,
      options: {
         inlineClassName: 'mtk103.Identifier.JsxAttribute.Identifier ',
      },
   },
   JSXExpressionContainer: {
      highlightScope: HIGHLIGHT_TYPE.EDGE,
      options: {
         inlineClassName: 'mtk105.Identifier.JSXExpressionContainer.Bracket',
      },
   },
   JSXElement: {
      highlightScope: HIGHLIGHT_TYPE.STYLE,
      options: (elementName) => (
         {
            glyphMarginClassName: 'mtk105.glyph.Identifier.JsxElement',
            glyphMarginHoverMessage:
               `JSX Element${elementName ? ': ' + elementName : ''}`
         }
      ),
   },
   JSXBracket: {
      highlightScope: HIGHLIGHT_TYPE.STYLE,
      options: {
         inlineClassName: 'mtk100.Identifier.JsxElement.Bracket',
      },
      openingElementOptions: {
         inlineClassName: 'mtk1000.Identifier.JsxOpeningElement.Bracket',
      },
      closingElementOptions: {
         inlineClassName: 'mtk1001.Identifier.JsxClosingElement.Bracket',
      },
   },
};

export const JSXCommentContexts = {
   JS: 'JS',
   JSX: 'JSX'
}

export const configureLocToMonacoRange = (
   _monaco = monaco, parserType = 'babel'
) => {
   switch (parserType) {
      case 'babel':
      default:
         return (
            loc,
            startLineOffset = 0,
            startColumnOffset = 0,
            endLineOffset = 0,
            endColumnOffset = 0,
         ) => {
            if (!loc || !loc.start) {
               return new _monaco.Range(
                  1,
                  1,
                  1,
                  1
               );
            }
            return new _monaco.Range(
               startLineOffset + loc.start.line,
               startColumnOffset + loc.start.column + 1,
               endLineOffset + loc.end ?
                  loc.end.line
                  : loc.start.line,
               endColumnOffset + loc.end ?
                  loc.end.column + 1
                  : loc.start.column + 1,
            );
         };
   }
};

class MonacoJSXHighlighter {
   commentActionId = "editor.action.commentLine";
   // commandActionId = "jsx-comment-edit";
   _isHighlightBoundToModelContentChanges = false;
   _isGetJSXCommentActive = false;
   _isEditorDisposed = false;
   
   constructor(
      monacoRef,
      parseRef,
      traverseRef,
      monacoEditor,
      options = {},
   ) {
      monaco = monacoRef;
      parse = parseRef;
      traverse = traverseRef;
      this.options = {...defaultOptions, ...options};
      const {parserType} = this.options;
      this.locToMonacoRange = configureLocToMonacoRange(monaco, parserType);
      this.monacoEditor = monacoEditor;
   }
   
   getAstPromise = () => new Promise((resolve) => {
      resolve(parse(this.monacoEditor.getValue()));
   });
   
   highLightOnDidChangeModelContent = (
      debounceTime = 100,
      afterHighlight = ast => ast,
      onError = error => console.error(error),
      getAstPromise = this.getAstPromise,
      onJsCodeShiftErrors = error => console.log(error),
   ) => {
      this.highlightCode(
         afterHighlight, onError, getAstPromise, onJsCodeShiftErrors
      );
      
      let tid = null;
      
      let highlighterDisposer = this.monacoEditor.onDidChangeModelContent(
         () => {
            clearTimeout(tid);
            setTimeout(() => {
                  this.highlightCode(
                     afterHighlight, onError, getAstPromise, onJsCodeShiftErrors
                  );
               },
               debounceTime
            );
         }
      );
      this._isHighlightBoundToModelContentChanges = true;
      
      this.monacoEditor.onDidDispose(() => {
         highlighterDisposer = null;
         this._isEditorDisposed = true;
         this._isHighlightBoundToModelContentChanges = false;
      });
      return () => {
         if (this._isEditorDisposed ||
            !this._isHighlightBoundToModelContentChanges
         ) {
            return;
         }
         highlighterDisposer.dispose();
         this.monacoEditor.deltaDecorations(
            this.JSXDecoratorIds || [],
            [],
         );
         highlighterDisposer = null;
         this._isHighlightBoundToModelContentChanges = false;
      };
   };
   
   highlightCode = (
      afterHighlight = ast => ast,
      onError = error => console.error(error),
      getAstPromise = this.getAstPromise,
      onJsParserErrors = error => error,
   ) =>
      (
         getAstPromise()
            .then(ast => this.highlight(ast))
            .catch(onJsParserErrors)
      )
         .then(afterHighlight)
         .catch(onError);
   
   highlight = (ast, jsxTraverseAst = _jsxTraverseAst, forceUpdate) => {
      return new Promise((resolve) => {
         if (ast && (forceUpdate || ast !== this.ast)) {
            this.ast = ast;
            this.jsxManager = _jsxTraverseAst(ast);
            this.decorators = this.extractAllDecorators(this.jsxManager);
            resolve(ast);
         }
      });
      
   };
   
   extractAllDecorators = (jsxManager = this.jsxManager) => {
      const decorators = this.createJSXElementDecorators(jsxManager);
      for (const jsxType in JSXTypes) {
         this.createDecoratorsByType(
            jsxManager,
            jsxType,
            JSXTypes[jsxType].options,
            JSXTypes[jsxType].highlightScope,
            decorators,
         );
      }
      this.JSXDecoratorIds =
         this.monacoEditor.deltaDecorations(
            this.JSXDecoratorIds || [],
            decorators,
         );
      return decorators;
   }
   
   createJSXElementDecorators = (
      jsxManager,
      decorators = [],
      highlighterOptions = this.options,
   ) => {
      jsxManager
         .findJSXElements()
         .forEach(p => {
            const loc = p.node.loc;
            const openingElement = p.node.openingElement;
            let elementName = null;
            if (openingElement) {
               const oLoc = openingElement.loc;
               elementName = openingElement.name.name;
               decorators.push({
                  range: new monaco.Range(
                     oLoc.start.line,
                     oLoc.start.column + 1,
                     oLoc.start.line,
                     oLoc.start.column + 2
                  ),
                  options: highlighterOptions.isUseSeparateElementStyles ?
                     JSXTypes.JSXBracket.openingElementOptions
                     : JSXTypes.JSXBracket.options,
               });
               decorators.push({
                  range: new monaco.Range(
                     oLoc.end.line,
                     oLoc.end.column + (
                        openingElement.selfClosing ? -1 : 0
                     ),
                     oLoc.end.line,
                     oLoc.end.column + 1
                  ),
                  options: highlighterOptions.isUseSeparateElementStyles ?
                     JSXTypes.JSXBracket.openingElementOptions
                     : JSXTypes.JSXBracket.options,
               });
            }
            const closingElement = p.node.closingElement;
            if (closingElement) {
               const cLoc = closingElement.loc;
               decorators.push({
                  range: new monaco.Range(
                     cLoc.start.line,
                     cLoc.start.column + 1,
                     cLoc.start.line,
                     cLoc.start.column + 3
                  ),
                  options: highlighterOptions.isUseSeparateElementStyles ?
                     JSXTypes.JSXBracket.closingElementOptions
                     : JSXTypes.JSXBracket.options,
               });
               decorators.push({
                  range: new monaco.Range(
                     cLoc.end.line,
                     cLoc.end.column,
                     cLoc.end.line,
                     cLoc.end.column + 1
                  ),
                  options: highlighterOptions.isUseSeparateElementStyles ?
                     JSXTypes.JSXBracket.closingElementOptions
                     : JSXTypes.JSXBracket.options,
               });
            }
            
            highlighterOptions.isHighlightGlyph && decorators.push({
               range: this.locToMonacoRange(loc),
               options: JSXTypes.JSXElement.options(elementName),
            });
         });
      return decorators;
   };
   
   getJSXContext = (selection, ast, editor = this.monacoEditor) => {
      
      const range = new monaco.Range(
         selection.startLineNumber,
         0,
         selection.startLineNumber,
         0
      );
      
      
      let minRange = null;
      let path = null;
      let jsxManager = ast ? this.jsxManager : null;
      if (!this._isHighlightBoundToModelContentChanges) {
         jsxManager = ast ? _jsxTraverseAst(ast) : null;
      }
      
      jsxManager && jsxManager.findJSXElements().forEach(p => {
         const loc = p.node.loc;
         const _range = this.locToMonacoRange(loc);
         
         if (_range.intersectRanges(range)) {
            if (!minRange || minRange.containsRange(_range)) {
               minRange = _range;
               path = p;
            }
         }
      });
      let leftmostNode = null;
      let leftmostJsxTextNode = null;
      let leftmostNodeRange = null;
      let leftmostJsxTextNodeRange = null;
      
      if (path) {
         const {children = []} = path.node || {};
         const getLeftMostNode = node => {
            const loc = node && node.loc;
            const _range = loc && this.locToMonacoRange(loc);
            
            if (node.type === 'JSXText') {
               if (!leftmostNode && _range.containsRange(range)) {
                  leftmostJsxTextNode = node;
                  leftmostJsxTextNodeRange = _range;
               }
            } else {
               if (_range &&
                  _range.startLineNumber === range.startLineNumber) {
                  if (
                     !leftmostNode ||
                     _range.startColumn < leftmostNodeRange.startColumn
                  ) {
                     leftmostNode = node;
                     leftmostNodeRange = _range;
                     
                  }
               }
               
            }
         }
         children.forEach(getLeftMostNode);
      }
      let commentContext = leftmostNode || leftmostJsxTextNode ?
         JSXCommentContexts.JSX : JSXCommentContexts.JS;
      return commentContext;
   };
   
   getJSXCommentContext = (
      selection,
      getAstPromise = this.getAstPromise,
      onJsCodeShiftErrors = error => error,
      editor = this.monacoEditor
   ) => {
      return new Promise((resolve) => {
            if (this._isHighlightBoundToModelContentChanges) {
               resolve(this.getJSXContext(selection, this.ast, editor));
            } else {
               getAstPromise().then(ast => {
                     resolve(this.getJSXContext(selection, ast, editor));
                  })
                  .catch(
                     (error) => resolve(
                        this.getJSXContext(selection, null, editor)
                     ) || onJsCodeShiftErrors(error)
                  )
            }
         }
      ).catch(onJsCodeShiftErrors);
   };
   
   executeEditorEdits = (
      range,
      text,
      editor = this.monacoEditor,
      identifier = {major: 1, minor: 1},
      forceMoveMarkers = true,
      commandId = "jsx-comment-edit",
   ) => {
      const op = {
         identifier: {major: 1, minor: 1},
         range,
         text,
         forceMoveMarkers,
      };
      editor.executeEdits(commandId, [op]);
   };
   
   addJSXCommentCommand = (
      getAstPromise = this.getAstPromise,
      onJsCodeShiftErrors = error => error,
      editor = this.monacoEditor,
   ) => {
      this._isGetJSXCommentActive = true;
      this._editorCommandId = editor.addCommand(
         monaco.KeyMod.CtrlCmd | monaco.KeyCode.US_SLASH,
         () => {
            if (!this._isGetJSXCommentActive) {
               editor.getAction(this.commentActionId).run();
               return;
            }
            const selection = editor.getSelection();
            const model = editor.getModel();
            
            this.getJSXCommentContext(
               selection,
               getAstPromise,
               onJsCodeShiftErrors,
               editor,
            ).then((commentContext) => {
               
               
               let isUnCommentAction = true;
               
               const commentsData = [];
               
               for (let i = selection.startLineNumber;
                    i <= selection.endLineNumber;
                    i++) {
                  const commentRange = new monaco.Range(
                     i,
                     model.getLineFirstNonWhitespaceColumn(i),
                     i,
                     model.getLineMaxColumn(i),
                  );
                  
                  const commentText = model.getValueInRange(commentRange);
                  
                  commentsData.push({
                     commentRange,
                     commentText
                  });
                  
                  isUnCommentAction = isUnCommentAction &&
                     !!commentText.match(/{\/\*/);
               }
               
               
               if (commentContext !== JSXCommentContexts.JSX
                  && !isUnCommentAction) {
                  editor.getAction(this.commentActionId).run();
                  return;
               }
               
               let editOperations = [];
               let commentsDataIndex = 0;
               
               for (let i = selection.startLineNumber;
                    i <= selection.endLineNumber;
                    i++) {
                  let {
                     commentText,
                     commentRange,
                  } = commentsData[commentsDataIndex++];
                  
                  if (isUnCommentAction) {
                     commentText = commentText.replace(/{\/\*/, '');
                     commentText = commentText.replace(/\*\/}/, '');
                  } else {
                     commentText = `{/*${commentText}*/}`;
                  }
                  
                  editOperations.push({
                     identifier: {major: 1, minor: 1},
                     range: commentRange,
                     text: commentText,
                     forceMoveMarkers: true,
                  });
               }
               editOperations.length &&
               editor.executeEdits(this._editorCommandId, editOperations);
               /*commandActionId*/
            });
            
         });
      
      this.monacoEditor.onDidDispose(() => {
         this._isEditorDisposed = true;
         this._isGetJSXCommentActive = false;
      });
      
      return () => {
         this._isGetJSXCommentActive = false;
      }
   }
   
   createDecoratorsByType = (
      jsxManager,
      jsxType,
      jsxTypeOptions,
      highlightScope,
      decorators = [],
      highlighterOptions = this.options,
      locToMonacoRange = this.locToMonacoRange,
   ) => {
      jsxManager.find(jsxType)
         .forEach(path => HIGHLIGHT_MODE[highlightScope](
            path,
            jsxTypeOptions,
            decorators,
            highlighterOptions,
            locToMonacoRange
            )
         );
      
      return decorators;
   };
}

export default MonacoJSXHighlighter;
