export const JSXCommentContexts = {
   JS: 'JS',
   JSX: 'JSX'
}

export function getJSXContext(
   jsxExpressions,
   commentableRange,
   commentContainingRange,
   loc2Range
) {
   if (!(jsxExpressions &&
      commentableRange &&
      commentContainingRange &&
      loc2Range)) {
      return JSXCommentContexts.JS;
   }
   
   
   let minRange = null;
   let minCommentableRange = null;
   let path = null;
   let commentablePath = null;
   
   jsxExpressions.forEach(p => {
      const jsxRange = loc2Range(p.node.loc);
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
      if (jsxRange.intersectRanges(commentContainingRange)) {
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

class Commenter {
   constructor(
      monacoEditorManager,
      parseJSXExpressionsPromise
   ) {
      
      let _editorCommandId = null;
      
      this.getEditorCommandId = () => {
         return _editorCommandId;
      }
      
      let _isJSXCommentCommandActive = false;
      
      this.isJSXCommentCommandActive = () => {
         return _isJSXCommentCommandActive;
      }
      
      const editorCommandOnDispose = () => {
         _isJSXCommentCommandActive = false;
      };
      
      this.runJsxCommentAction = (selection, commentContext) => {
         const {
            monacoEditor, monaco, runEditorCommentLineAction,
            getSelectionFirstLineText,
         } = monacoEditorManager;
         
         const jsCommentText = getSelectionFirstLineText();
         
         if (jsCommentText.match(/^\s*\/[/*]/)) {
            runEditorCommentLineAction(monacoEditor);
            return;
         }
         
         const model = monacoEditor.getModel();
         
         let isUnCommentAction = true;
         const commentsData = [];
         
         for (
            let i = selection.startLineNumber; i <= selection.endLineNumber; i++
         ) {
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
            runEditorCommentLineAction(monacoEditor);
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
         monacoEditor.executeEdits(_editorCommandId, editOperations);
      }
      
      this.addJSXCommentCommand = () => {
         const {
            monacoEditor, monaco, loc2Range, runEditorCommentLineAction,
            getCommentableStartingRange, getCommentContainingStartingRange
         } = monacoEditorManager;
         
         if (_editorCommandId) {
            _isJSXCommentCommandActive = true;
            return editorCommandOnDispose;
         }
         
         _editorCommandId = monacoEditor.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.US_SLASH,
            () => {
               if (!_isJSXCommentCommandActive) {
                  return runEditorCommentLineAction(monacoEditor);
               }
               
               parseJSXExpressionsPromise()
                  .then(jsxExpressions => {
                     const selection = monacoEditor.getSelection();
                     const commentContext = getJSXContext(
                        jsxExpressions,
                        getCommentableStartingRange(selection),
                        getCommentContainingStartingRange(selection),
                        loc2Range
                     );
                     this.runJsxCommentAction(selection, commentContext);
                  });
            });
         
         _isJSXCommentCommandActive = true;
         
         monacoEditor.onDidDispose(editorCommandOnDispose);
         
         return editorCommandOnDispose;
      }
   }
}

export default Commenter;
