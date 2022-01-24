export const COMMENT_ACTION_ID = "editor.action.commentLine";

// adapts location objects (e.g. Babel uses internally Acorn) to Monaco Ranges
export const configureLoc2Range = (
   monaco, parserType = 'babel'
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
               return new monaco.Range(
                  1,
                  1,
                  1,
                  1
               );
            }
            return new monaco.Range(
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

export const configureRange2Loc = (
   parserType = 'babel'
) => {
   switch (parserType) {
      case 'babel':
      default:
         return (
            rangeOrPosition,
            startLineOffset = 0,
            startColumnOffset = 0,
            endLineOffset = 0,
            endColumnOffset = 0,
         ) => {
            const loc = {
               start: {line: 0, column: 0},
               end: {line: 0, column: 0}
            };
            
            if (!rangeOrPosition) {
               return loc;
            }
            
            // position
            if (rangeOrPosition.lineNumber) {
               loc.start.line =
                  startLineOffset + rangeOrPosition.lineNumber;
               loc.start.column =
                  startColumnOffset + rangeOrPosition.column - 1;
               loc.end.line = endLineOffset + rangeOrPosition.lineNumber;
               loc.end.column = endColumnOffset + rangeOrPosition.column - 1;
            } else {
               loc.start.line =
                  startLineOffset + rangeOrPosition.startLineNumber;
               loc.start.column =
                  startColumnOffset + rangeOrPosition.startColumn - 1;
               loc.end.line = endLineOffset + rangeOrPosition.endLineNumber;
               loc.end.column = endColumnOffset + rangeOrPosition.endColumn - 1;
            }
            
            return loc;
         };
   }
};

export class MonacoEditorManager {
   constructor(monacoEditor, monaco, loc2Range) {
      this.monacoEditor = monacoEditor;
      this.monaco = monaco;
      this.loc2Range = loc2Range || configureRange2Loc(monaco);
      
      // default editor comment action
      this.runEditorCommentLineAction = () => {
         return this.monacoEditor
            .getAction(COMMENT_ACTION_ID)
            .run();
      };
      
      // preserves indentation when commenting code
      this.getLineIndentationColumn = (lineNumber) => {
         return this.monacoEditor
            .getModel()
            .getLineFirstNonWhitespaceColumn(
               lineNumber
            );
      };
      
      this.getCommentableStartingRange = (range) => {
         const startColumn = this.getLineIndentationColumn(
            range.startLineNumber
         );
         
         // creates an anchor to check for comments
         const commentableRange = new this.monaco.Range(
            range.startLineNumber,
            startColumn,
            range.startLineNumber,
            startColumn,
         );
         
         return commentableRange;
      };
      
      this.getCommentContainingStartingRange = (range) => {
         // preserves indentation when commenting code
         let startColumn = this.getLineIndentationColumn(
            range.startLineNumber
         );
         
         startColumn = startColumn ? startColumn - 1 : 0;
         const containingRange = new this.monaco.Range(
            range.startLineNumber,
            startColumn,
            range.startLineNumber,
            startColumn,
         );
         
         return containingRange;
      };
      
      this.getSelectionFirstLineText = () => {
         const model = this.monacoEditor.getModel();
         const {startLineNumber} = this.monacoEditor.getSelection();
         
         const jsCommentRange = new this.monaco.Range(
            startLineNumber,
            this.getLineIndentationColumn(
               startLineNumber
            ),
            startLineNumber,
            model.getLineMaxColumn(startLineNumber),
         );
         return model.getValueInRange(jsCommentRange);
      };
   }
}
