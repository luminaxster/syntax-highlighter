import {
   configureLoc2Range,
   configureRange2Loc,
   MonacoEditorManager
} from '../utils/monaco';
import {collectJSXExpressions} from '../utils/babel';
import DecoratorMapper from './DecoratorMapper';
import Commenter from './Commenter';

const defaultOptions = {
   parser: 'babel',
   isHighlightGlyph: false,
   iShowHover: false,
   isUseSeparateElementStyles: false,
   jsxCommenter: null,
   monacoEditorManager: null,
   decoratorMapper: null,
};

export const makeGetAstPromise = (parse, monacoEditor) => () => {
   return new Promise(
      (resolve, reject) => {
         try {
            return resolve(
               parse(monacoEditor.getValue()) // ast
            );
         } catch (e) {
            return reject(e);
         }
      }
   );
};

export const makeParseJSXExpressionsPromise = (
   traverse, getAstPromise, _collectJSXExpressions = collectJSXExpressions
) => () => {
   return new Promise((resolve, reject) => {
      getAstPromise()
         .then(ast => {
               try {
                  return resolve(
                     _collectJSXExpressions(ast, traverse)
                  );
               } catch (e) {
                  return reject(e);
               }
            }
         ).catch(e => reject(e));
   });
};

export const makeJSXCommenterBundle = (
   monaco, parse, traverse, monacoEditor, options = {}
) => {
   const {parserType, jsxCommenter, monacoEditorManager} = options;
   const range2Loc = configureRange2Loc(parserType);
   const loc2Range = configureLoc2Range(monaco, parserType);
   
   const getAstPromise = makeGetAstPromise(parse, monacoEditor);
   
   const parseJSXExpressionsPromise = makeParseJSXExpressionsPromise(
      traverse, getAstPromise
   );
   
   const _monacoEditorManager = monacoEditorManager ||
      new MonacoEditorManager(monacoEditor, monaco, loc2Range);
   
   const _jsxCommenter = jsxCommenter || new Commenter(
      _monacoEditorManager, parseJSXExpressionsPromise
   );
   
   return [
      _jsxCommenter, _monacoEditorManager,
      parseJSXExpressionsPromise, getAstPromise,
      loc2Range, range2Loc
   ];
};

// Minimal Babel setup for React JSX parsing:
export const makeBabelParse = (parse) => {
   return (code, options = {}) => {
      return parse(
         code,
         {
            ...options,
            sourceType: "module",
            plugins: ["jsx"],
            errorRecovery: true
         });
      
   };
};

class MonacoJSXHighlighter {
   constructor(
      monaco,
      parse,
      traverse,
      monacoEditor,
      options = {}
   ) {
      this.options = {...defaultOptions, ...options};
      
      const {jsxCommenter, monacoEditorManager, decoratorMapper} = this.options;
      
      this.babelParse = makeBabelParse(parse);
      
      const [
         _jsxCommenter, _monacoEditorManager,
         parseJSXExpressionsPromise, getAstPromise,
         loc2Range, range2Loc
      ] = makeJSXCommenterBundle(
         monaco, this.babelParse, traverse, monacoEditor, this.options
      );
      
      this.jsxCommenter = jsxCommenter || _jsxCommenter;
      this.monacoEditorManager = monacoEditorManager || _monacoEditorManager;
      this.parseJSXExpressionsPromise = parseJSXExpressionsPromise;
      this.getAstPromise = getAstPromise;
      this.loc2Range = loc2Range;
      this.range2Loc = range2Loc;
      
      this.addJSXCommentCommand = this.jsxCommenter.addJSXCommentCommand;
      
      
      this.decoratorMapper = decoratorMapper ||
         new DecoratorMapper(monacoEditor, this.loc2Range);
      this.decoratorMapperReset = () => {
         decoratorMapper.reset()
      };
      
      this.highlight = (
         ast, _collectJSXExpressions = collectJSXExpressions
      ) => {
         return new Promise((resolve, reject) => {
            const {decoratorMapper, options} = this;
            const result = {
               decoratorMapper,
               options,
               ast,
               jsxExpressions: [],
            };
            
            //ignore update if parsing was unsuccessful
            if (!ast) {
               return resolve(result);
            }
            
            try {
               const jsxExpressions = _collectJSXExpressions(ast, traverse);
               
               decoratorMapper.deltaJSXDecorations(
                  jsxExpressions, options
               );
               
               result.jsxExpressions = jsxExpressions;
               
               return resolve(result);
            } catch (e) {
               return reject(e);
            }
         });
      };
      
      this.highlightCode = (
         afterHighlight = ast => ast,
         onHighlightError = error => error,
         getAstPromise = this.getAstPromise,
         onGetAstError = error => error,
      ) => {
         return (
            getAstPromise()
               .then(ast => {
                  this.highlight(ast)
                     .then(afterHighlight)
                     .catch(onHighlightError)
               })
               .catch(onGetAstError)
         );
      };
      
      let _isHighlightBoundToModelContentChanges = false;
      
      this.isHighlightBoundToModelContentChanges =
         () => _isHighlightBoundToModelContentChanges;
      
      this.highlightOnDidChangeModelContent = (
         debounceTime = 100,
         afterHighlight = ast => ast,
         onHighlightError = error => error,
         getAstPromise = this.getAstPromise,
         onParseAstError = error => error,
      ) => {
         const highlightCallback = () => {
            return this.highlightCode(
               afterHighlight,
               onHighlightError,
               getAstPromise,
               onParseAstError
            );
         };
         
         highlightCallback();
         
         let tid = null;
         
         let highlighterDisposer = {
            onDidChangeModelContentDisposer:
               monacoEditor.onDidChangeModelContent(
                  () => {
                     clearTimeout(tid);
                     tid = setTimeout(
                        highlightCallback,
                        debounceTime
                     );
                  }),
            onDidChangeModelDisposer: monacoEditor.onDidChangeModel(
               () => {
                  highlightCallback();
               })
         };
         
         highlighterDisposer.dispose = () => {
            highlighterDisposer.onDidChangeModelContentDisposer.dispose();
            highlighterDisposer.onDidChangeModelDisposer.dispose();
         };
         
         _isHighlightBoundToModelContentChanges = true;
         
         const onDispose = () => {
            this.decoratorMapper.reset();
            if (
               !_isHighlightBoundToModelContentChanges
            ) {
               return;
            }
            _isHighlightBoundToModelContentChanges = false;
            highlighterDisposer && highlighterDisposer.dispose();
            highlighterDisposer = null;
            
         }
         
         monacoEditor.onDidDispose(() => {
            this.decoratorMapper.reset();
            highlighterDisposer = null;
            _isHighlightBoundToModelContentChanges = false;
         });
         
         
         return onDispose;
      };
      
      // backwards compatible typo preserve to avoid breaking changes
      this.highLightOnDidChangeModelContent =
         this.highlightOnDidChangeModelContent;
   }
}

// use .polyfilled dist when usign node < 10. // .babelrc.json:  "node": "0"
export default MonacoJSXHighlighter;
