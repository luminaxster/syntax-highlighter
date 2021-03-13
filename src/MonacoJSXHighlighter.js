import './MonacoJSXHighlighter.css';

let monaco = null, parse = null, traverse = null;

const defaultOptions = {
   parser: 'babel',
   isHighlightGlyph: false,
   iShowHover: false,
   isUseSeparateElementStyles: false,
   isThrowJSXParseErrors: false,
};

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
}

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
   ELEMENT: 'ELEMENT', // jsx elements
   ALL: 'ALL', // the whole node's location, e.g. identifier names
   IDENTIFIER: 'IDENTIFIER', // JSX identifiers
   EDGE: 'EDGE', // only the  starting and ending characters in node's
   // location e.g. spread child or attribute, container expressions
   STYLE: 'STYLE', // for styling only, not used by node locations
};

export const HIGHLIGHT_MODE = {
   [HIGHLIGHT_TYPE.ELEMENT]: (
      path,
      jsxTypeOptions,
      decorators = [],
      highlighterOptions,
      locToMonacoRange,
   ) => {
      const loc = path.node.loc;
      const openingElement = path.node.openingElement;
      let elementName = null;
      if (openingElement) {
         elementName = openingElement.name.name;
         
         const startLoc = {
            start: {...openingElement.loc.start},
            end: {...openingElement.name.loc.start}
         };
         
         const endLoc = {
            start: {...openingElement.loc.end},
            end: {...openingElement.loc.end}
         };
         endLoc.start.column--;
         
         if (openingElement.selfClosing) {
            endLoc.start.column--;
         }
         
         decorators.push({
            range: locToMonacoRange(startLoc),
            options: highlighterOptions.isUseSeparateElementStyles ?
               JSXTypes.JSXBracket.openingElementOptions
               : JSXTypes.JSXBracket.options,
         });
         
         decorators.push({
            range: locToMonacoRange(endLoc),
            options: highlighterOptions.isUseSeparateElementStyles ?
               JSXTypes.JSXBracket.openingElementOptions
               : JSXTypes.JSXBracket.options,
         });
      }
      
      const closingElement = path.node.closingElement;
      if (closingElement) {
         const startLoc = {
            start: {...closingElement.loc.start},
            end: {...closingElement.name.loc.start}
         };
         
         const endLoc = {
            start: {...closingElement.loc.end},
            end: {...closingElement.loc.end}
         };
         endLoc.start.column--;
         
         decorators.push({
            range: locToMonacoRange(startLoc),
            options: highlighterOptions.isUseSeparateElementStyles ?
               JSXTypes.JSXBracket.closingElementOptions
               : JSXTypes.JSXBracket.options,
         });
         decorators.push({
            range: locToMonacoRange(endLoc),
            options: highlighterOptions.isUseSeparateElementStyles ?
               JSXTypes.JSXBracket.closingElementOptions
               : JSXTypes.JSXBracket.options,
         });
      }
      
      highlighterOptions.isHighlightGlyph && decorators.push({
         range: locToMonacoRange(loc),
         options: JSXTypes.JSXElement.options(elementName),
      });
   },
   [HIGHLIGHT_TYPE.ALL]: (
      path,
      jsxTypeOptions,
      decorators = [],
      highlighterOptions,
      locToMonacoRange,
   ) => {
      const loc = {
         start: {...path.node.loc.start},
         end: {...path.node.loc.end}
      };
      
      if (path.key === 'object') {
         loc.end = {...path.container.property.loc.start};
      }
      locToMonacoRange && decorators.push({
         range: locToMonacoRange(loc),
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
      
      if (
         path.key === 'object' ||
         path.key === 'property' ||
         path.key === 'name' ||
         path.key === 'namespace'
      ) {
         HIGHLIGHT_MODE[HIGHLIGHT_TYPE.ALL](
            path,
            path.parentPath && path.parentPath.isJSXAttribute() ?
               JSXTypes.JSXAttribute.options : jsxTypeOptions,
            decorators,
            highlighterOptions,
            locToMonacoRange,
         );
      }
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
      let innerLocKey =
         path.isJSXSpreadChild() ? 'expression'
            : path.isJSXSpreadAttribute() ? 'argument' : null;
      
      let innerLoc = null;
      
      if (innerLocKey) {
         const innerNode = path.node[innerLocKey];
         innerLoc = {
            start: {...innerNode.loc.start},
            end: {...innerNode.loc.end}
         };
         if (innerNode.extra && innerNode.extra.parenthesized) {
            innerLoc.start.column--;
            innerLoc.end.column++;
         }
      } else {
         innerLoc = {start: {...loc.start}, end: {...loc.end}};
         innerLoc.start.column++;
         innerLoc.end.column--;
      }
      
      const startEdgeLoc = {start: {...loc.start}, end: {...innerLoc.start}};
      
      const endEdgeLoc = {start: {...innerLoc.end}, end: {...loc.end}};
      
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
   JSXIdentifier: {
      highlightScope: HIGHLIGHT_TYPE.IDENTIFIER,
      options: {
         inlineClassName: 'JSXElement.JSXIdentifier',
      },
   },
   JSXOpeningFragment: {
      highlightScope: HIGHLIGHT_TYPE.ALL,
      options: {
         inlineClassName: 'JSXOpeningFragment.JSXBracket',
      },
   },
   JSXClosingFragment: {
      highlightScope: HIGHLIGHT_TYPE.ALL,
      options: {
         inlineClassName: 'JSXClosingFragment.JSXBracket',
      },
   },
   JSXText: {
      highlightScope: HIGHLIGHT_TYPE.ALL,
      options: {
         inlineClassName: 'JSXElement.JSXText',
      },
   },
   JSXExpressionContainer: {
      highlightScope: HIGHLIGHT_TYPE.EDGE,
      options: {
         inlineClassName: 'JSXExpressionContainer.JSXBracket',
      },
   },
   JSXSpreadChild: {
      highlightScope: HIGHLIGHT_TYPE.EDGE,
      options: {
         inlineClassName: 'JSXSpreadChild.JSXBracket',
      },
   },
   JSXSpreadAttribute: {
      highlightScope: HIGHLIGHT_TYPE.EDGE,
      options: {
         inlineClassName: 'JSXSpreadAttribute.JSXBracket',
      },
   },
   JSXElement: {
      highlightScope: HIGHLIGHT_TYPE.STYLE,
      options: (elementName) => (
         {
            glyphMarginClassName: 'JSXElement.JSXGlyph',
            glyphMarginHoverMessage:
               `JSX Element${elementName ? ': ' + elementName : ''}`
         }
      ),
   },
   JSXBracket: {
      highlightScope: HIGHLIGHT_TYPE.STYLE,
      options: {
         inlineClassName: 'JSXElement.JSXBracket',
      },
      openingElementOptions: {
         inlineClassName: 'JSXOpeningElement.JSXBracket',
      },
      closingElementOptions: {
         inlineClassName: 'JSXClosingElement.JSXBracket',
      },
   },
   JSXOpeningElement: {
      highlightScope: HIGHLIGHT_TYPE.STYLE,
      options: {
         inlineClassName: 'JSXOpeningElement.JSXIdentifier',
      },
   },
   JSXClosingElement: {
      highlightScope: HIGHLIGHT_TYPE.STYLE,
      options: {
         inlineClassName: 'JSXClosingElement.JSXIdentifier',
      },
   },
   JSXAttribute: {
      highlightScope: HIGHLIGHT_TYPE.STYLE,
      options: {
         inlineClassName: 'JSXAttribute.JSXIdentifier',
      },
   },
};

export const JSXCommentContexts = {
   JS: 'JS',
   JSX: 'JSX'
}

export const COMMENT_ACTION_ID = "editor.action.commentLine";

class MonacoJSXHighlighter {
   constructor(
      monacoRef,
      parseRef,
      traverseRef,
      monacoEditor,
      options = {ownerId: 20190313},
   ) {
      this.resetState = this.resetState.bind(this);
      this.resetDeltaDecorations = this.resetDeltaDecorations.bind(this);
      this.getAstPromise = this.getAstPromise.bind(this);
      this.highLightOnDidChangeModelContent =
         this.highLightOnDidChangeModelContent.bind(this);
      this.highlightCode = this.highlightCode.bind(this);
      this.highlight = this.highlight.bind(this);
      this.createDecoratorsByType = this.createDecoratorsByType.bind(this);
      this.createJSXElementDecorators =
         this.createJSXElementDecorators.bind(this);
      this.extractAllDecorators = this.extractAllDecorators.bind(this);
      this.getJSXContext = this.getJSXContext.bind(this);
      this.runJSXCommentContextAndAction =
         this.runJSXCommentContextAndAction.bind(this);
      this.addJSXCommentCommand = this.addJSXCommentCommand.bind(this);
      
      this._isHighlightBoundToModelContentChanges = false;
      this._isJSXCommentCommandActive = false;
      monaco = monacoRef;
      parse = parseRef;
      traverse = traverseRef;
      this.options = {...defaultOptions, ...options};
      const {parserType} = this.options;
      this.locToMonacoRange = configureLocToMonacoRange(monaco, parserType);
      this.monacoEditor = monacoEditor;
      this.resetState();
   }
   
   resetState() {
      this.prevEditorValue = null;
      this.editorValue = null;
      this.ast = null;
      this.jsxManager = null;
   }
   
   resetDeltaDecorations() {
      this.JSXDecoratorIds = (this.monacoEditor &&
         this.monacoEditor.getModel().deltaDecorations(
            this.JSXDecoratorIds || [],
            [],
            this.options.ownerId
         )
      );
   }
   
   getAstPromise(forceUpdate) {
      return new Promise((resolve) => {
         if (
            forceUpdate ||
            !this.editorValue ||
            this.editorValue !== this.prevEditorValue
         ) {
            this.prevEditorValue = this.editorValue;
            this.editorValue = this.monacoEditor.getValue();
            try {
               this.ast = parse(this.editorValue);
            } catch (e) {
               if (
                  e instanceof SyntaxError &&
                  !e.message.includes('JSX')
               ) {
                  this.resetState();
                  throw e;
               } else {
                  if (this.options.isThrowJSXParseErrors) {
                     throw e;
                  } else {
                     resolve(this.ast);
                  }
               }
            }
         }
         resolve(this.ast);
      });
   }
   
   highLightOnDidChangeModelContent(
      debounceTime = 100,
      afterHighlight = ast => ast,
      onHighlightError = error => console.error(error),
      getAstPromise,
      onParseAstError = error => console.log(error),
   ) {
      getAstPromise = getAstPromise || this.getAstPromise;
      const highlightCallback = () => {
         this.highlightCode(
            afterHighlight,
            onHighlightError,
            getAstPromise,
            onParseAstError
         );
      };
      
      highlightCallback();
      
      let tid = null;
      
      let highlighterDisposer = this.monacoEditor.onDidChangeModelContent(
         () => {
            clearTimeout(tid);
            setTimeout(
               highlightCallback,
               debounceTime
            );
         }
      );
      this._isHighlightBoundToModelContentChanges = true;
      
      const onDispose = () => {
         this.resetState();
         this.resetDeltaDecorations();
         if (
            !this._isHighlightBoundToModelContentChanges
         ) {
            return;
         }
         this._isHighlightBoundToModelContentChanges = false;
         highlighterDisposer && highlighterDisposer.dispose();
         highlighterDisposer = null;
         
      }
      
      this.monacoEditor.onDidDispose(() => {
         this.resetDeltaDecorations();
         highlighterDisposer = null;
         this._isHighlightBoundToModelContentChanges = false;
      });
      return onDispose;
   }
   
   highlightCode(
      afterHighlight = ast => ast,
      onError = error => console.error(error),
      getAstPromise,
      onJsParserErrors = error => error,
   ) {
      getAstPromise = getAstPromise || this.getAstPromise;
      return (
         getAstPromise()
            .then(ast => this.highlight(ast))
            .catch(onJsParserErrors)
      )
         .then(afterHighlight)
         .catch(onError);
   }
   
   highlight(ast, jsxTraverseAst = _jsxTraverseAst) {
      return new Promise((resolve) => {
         if (ast) {
            this.jsxManager = jsxTraverseAst(ast);
            this.decorators = this.extractAllDecorators(this.jsxManager);
         }
         resolve(ast);
      });
   }
   
   createDecoratorsByType(
      jsxManager,
      jsxType,
      jsxTypeOptions,
      highlightScope,
      decorators = [],
      highlighterOptions,
      locToMonacoRange,
   ) {
      highlighterOptions = highlighterOptions || this.options;
      locToMonacoRange = locToMonacoRange || this.locToMonacoRange;
      jsxManager && jsxManager.find(jsxType)
         .forEach(path => HIGHLIGHT_MODE[highlightScope](
            path,
            jsxTypeOptions,
            decorators,
            highlighterOptions,
            locToMonacoRange
            )
         );
      
      return decorators;
   }
   
   createJSXElementDecorators(
      jsxManager,
      decorators = [],
      highlighterOptions,
      locToMonacoRange
   ) {
      highlighterOptions = highlighterOptions || this.options;
      locToMonacoRange = locToMonacoRange || this.locToMonacoRange;
      jsxManager && jsxManager
         .findJSXElements()
         .forEach(path => HIGHLIGHT_MODE.ELEMENT(
            path,
            null,
            decorators,
            highlighterOptions,
            locToMonacoRange
         ));
      return decorators;
   }
   
   extractAllDecorators(jsxManager) {
      jsxManager = jsxManager || this.jsxManager;
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
         this.monacoEditor.getModel().deltaDecorations(
            this.JSXDecoratorIds || [],
            decorators,
            this.options.ownerId
         );
      return decorators;
   }
   
   getJSXContext(
      selection,
      ast,
      monacoEditor,
      locToMonacoRange
   ) {
      monacoEditor = monacoEditor || this.monacoEditor;
      locToMonacoRange = locToMonacoRange || this.locToMonacoRange;
      let jsxManager = ast ? this.jsxManager : null;
      if (!this._isHighlightBoundToModelContentChanges) {
         jsxManager = ast ? _jsxTraverseAst(ast) : null;
      }
      
      if (!jsxManager) {
         return JSXCommentContexts.JS;
      }
      
      let startColumn =
         monacoEditor.getModel().getLineFirstNonWhitespaceColumn(
            selection.startLineNumber
         );
      
      const commentableRange = new monaco.Range(
         selection.startLineNumber,
         startColumn,
         selection.startLineNumber,
         startColumn,
      );
      
      startColumn = startColumn ? startColumn - 1 : 0;
      const containingRange = new monaco.Range(
         selection.startLineNumber,
         startColumn,
         selection.startLineNumber,
         startColumn,
      );
      
      
      let minRange = null;
      let minCommentableRange = null;
      let path = null;
      let commentablePath = null;
      
      jsxManager.jsxExpressions.forEach(p => {
         const jsxRange = locToMonacoRange(p.node.loc);
         if ((p.key === 'name' || p.key === 'property') &&
            p.isJSXIdentifier() &&
            jsxRange.intersectRanges(commentableRange)) {
            if (
               !minCommentableRange ||
               minCommentableRange.containsRange(jsxRange)
            ) {
               minCommentableRange = jsxRange;
               commentablePath = p;
            }
         }
         if (jsxRange.intersectRanges(containingRange)) {
            if (!minRange || minRange.containsRange(jsxRange)) {
               minRange = jsxRange;
               path = p;
            }
         }
      });
      
      if (!path || path.isJSXExpressionContainer() || commentablePath) {
         return JSXCommentContexts.JS;
      } else {
         return JSXCommentContexts.JSX;
      }
   }
   
   runJSXCommentContextAndAction(
      selection,
      getAstPromise,
      onJsCodeShiftErrors = error => error,
      editor,
      runJsxCommentAction
   ) {
      getAstPromise = getAstPromise || this.getAstPromise;
      editor = editor || this.monacoEditor;
      
      return new Promise((resolve) => {
            if (this._isHighlightBoundToModelContentChanges) {
               resolve(
                  runJsxCommentAction(
                     this.getJSXContext(selection, this.ast, editor)
                  )
               );
            } else {
               getAstPromise().then(ast => {
                     resolve(
                        runJsxCommentAction(
                           this.getJSXContext(selection, ast, editor)
                        )
                     );
                  })
                  .catch(
                     (error) => resolve(
                        runJsxCommentAction(
                           this.getJSXContext(selection, null, editor)
                        )
                     ) || onJsCodeShiftErrors(error)
                  )
            }
         }
      ).catch(error => (
            runJsxCommentAction(
               this.getJSXContext(selection, null, editor))
            || onJsCodeShiftErrors(error)
         )
      );
   }
   
   addJSXCommentCommand(
      getAstPromise,
      onJsCodeShiftErrors = error => error,
      editor
   ) {
      getAstPromise = getAstPromise || this.getAstPromise;
      editor = editor || this.monacoEditor;
      
      if (this._editorCommandId) {
         this._isJSXCommentCommandActive = true;
         return this.editorCommandOnDispose;
      }
      
      this._editorCommandId = editor.addCommand(
         monaco.KeyMod.CtrlCmd | monaco.KeyCode.US_SLASH,
         () => {
            if (!this._isJSXCommentCommandActive) {
               editor.getAction(COMMENT_ACTION_ID).run();
               return;
            }
            const selection = editor.getSelection();
            const model = editor.getModel();
            
            const jsCommentRange = new monaco.Range(
               selection.startLineNumber,
               model.getLineFirstNonWhitespaceColumn(selection.startLineNumber),
               selection.startLineNumber,
               model.getLineMaxColumn(selection.startLineNumber),
            );
            const jsCommentText = model.getValueInRange(jsCommentRange);
            
            if (jsCommentText.match(/^\s*\/[/*]/)) {
               editor.getAction(COMMENT_ACTION_ID).run();
               this.resetState();
               return;
            }
            
            const runJsxCommentAction = (commentContext) => {
               
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
                  editor.getAction(COMMENT_ACTION_ID).run();
                  this.resetState();
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
            };
            
            this.runJSXCommentContextAndAction(
               selection,
               getAstPromise,
               onJsCodeShiftErrors,
               editor,
               runJsxCommentAction
            ).catch(onJsCodeShiftErrors);
         });
      
      this.editorCommandOnDispose = () => {
         this._isJSXCommentCommandActive = false;
      };
      
      this._isJSXCommentCommandActive = true;
      
      editor.onDidDispose(this.editorCommandOnDispose);
      
      return this.editorCommandOnDispose;
   }
}

export default MonacoJSXHighlighter;
