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
   ELEMENT: 'ELEMENT', // jsx elements
   ALL: 'ALL', // the whole node's location, e.g. identifier names
   IDENTIFIER: 'IDENTIFIER', // JSX identifiers
   EDGE: 'EDGE', // only the  starting and ending character in node's location e.g. container expressions
   SPREAD: 'SPREAD', // only the  starting and ending characters in node's location e.g. spread child or attribute
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
         range: this.locToMonacoRange(loc),
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
   
   createJSXElementDecorators = (
      jsxManager,
      decorators = [],
      highlighterOptions = this.options,
      locToMonacoRange = this.locToMonacoRange
   ) => {
      jsxManager
         .findJSXElements()
         .forEach(path => HIGHLIGHT_MODE.ELEMENT(
            path,
            null,
            decorators,
            highlighterOptions,
            locToMonacoRange
         ));
      return decorators;
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
}

export default MonacoJSXHighlighter;
