import {BabelDataExtractor} from "../utils/babel";

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
   /**
    *  ALL functions follow this signature:
    *  @param {Babel Path} - the path to process.
    *  @param {Object} jsxTypeOptions - the Monaco Decorator options to be used.
    *  @param {Object} highlighterOptions - this library configuration for
    *  highlighting.
    *  @returns {Array} a collection JSX entries, each entry is an array too:
    *  0: location object matching Babel's Location structure.
    *  1: JSXTypes' Monaco options to create a highlighting  decorator.
    *  Note: Purposely array entries to prevent using them directly with
    Monaco without properly adapting Babel locations to Monaco Ranges.
    **/
   [HIGHLIGHT_TYPE.ELEMENT]: (
      path,
      jsxTypeOptions,
      highlighterOptions,
   ) => {
      const [
         openingElement, elementName, startLoc, endLoc
      ] = BabelDataExtractor.extractJSXOpeningElement(path);
      
      const result = [];
      
      if (openingElement) {
         result.push([
            startLoc,
            highlighterOptions.isUseSeparateElementStyles ?
               JSXTypes.JSXBracket.openingElementOptions
               : JSXTypes.JSXBracket.options
         ]);
         
         result.push([
            endLoc,
            highlighterOptions.isUseSeparateElementStyles ?
               JSXTypes.JSXBracket.openingElementOptions
               : JSXTypes.JSXBracket.options
         ]);
      }
      
      const [
         closingElement, , closingElementStartLoc, closingElementEndLoc
      ] = BabelDataExtractor.extractJSXClosingElement(path);
      
      if (closingElement) {
         result.push([
            closingElementStartLoc,
            highlighterOptions.isUseSeparateElementStyles ?
               JSXTypes.JSXBracket.closingElementOptions
               : JSXTypes.JSXBracket.options
         ]);
         result.push([
            closingElementEndLoc,
            highlighterOptions.isUseSeparateElementStyles ?
               JSXTypes.JSXBracket.closingElementOptions
               : JSXTypes.JSXBracket.options
         ]);
      }
      
      const loc = BabelDataExtractor.getLoc(path);
      highlighterOptions.isHighlightGlyph && result.push([
         loc,
         JSXTypes.JSXElement.options(elementName)
      ]);
      return result;
   },
   [HIGHLIGHT_TYPE.ALL]: (
      path,
      jsxTypeOptions,
      highlighterOptions,
   ) => {
      const curatedLoc = BabelDataExtractor.getCuratedLoc(path);
      const result = [];
      curatedLoc && result.push([
         curatedLoc,
         prepareOptions(path, jsxTypeOptions, highlighterOptions)
      ]);
      return result;
   },
   [HIGHLIGHT_TYPE.IDENTIFIER]: (
      path,
      jsxTypeOptions,
      highlighterOptions,
   ) => {
      if (!BabelDataExtractor.isJSXIdentifier(path)) {
         return [];
      }
      
      return HIGHLIGHT_MODE[HIGHLIGHT_TYPE.ALL](
         path,
         BabelDataExtractor.isParentJSXAttribute(path) ?
            JSXTypes.JSXAttribute.options : jsxTypeOptions,
         highlighterOptions,
      );
   },
   [HIGHLIGHT_TYPE.EDGE]: (
      path,
      jsxTypeOptions,
      highlighterOptions,
   ) => {
      const options = prepareOptions(path, jsxTypeOptions, highlighterOptions);
      
      const [
         , , startEdgeLoc, endEdgeLoc
      ] = BabelDataExtractor.extractJSXExpressionEdges(path);
      
      const result = [];
      
      result.push([
         startEdgeLoc,
         options
      ]);
      result.push([
         endEdgeLoc,
         options
      ]);
      
      return result;
      
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
      highlightScope: HIGHLIGHT_TYPE.ELEMENT, //HIGHLIGHT_TYPE.STYLE,
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

class DecoratorMapper {
   constructor(monacoEditor, loc2Range, _JSXTypes = JSXTypes) {
      let decorators = [];
      let jsxDecoratorIds = [];
      
      const addDecorator = ([loc, options]) => {
         return decorators.push({
            range: loc2Range(loc),
            options
         });
      }
      
      const deltaDecorations = () => {
         jsxDecoratorIds =
            monacoEditor.deltaDecorations(
               jsxDecoratorIds || [],
               decorators
            );
         decorators = [];
         return jsxDecoratorIds;
      }
      
      this.deltaJSXDecorations = (jsxExpressions, options) => {
         for (const jsxType in _JSXTypes) {
            jsxExpressions.filter(path => path.type === jsxType)
               .forEach(path =>
                  HIGHLIGHT_MODE[_JSXTypes[jsxType].highlightScope](
                     path,
                     _JSXTypes[jsxType].options,
                     options,
                  ).forEach(entry => addDecorator(entry))
               );
         }
         
         return deltaDecorations();
      }
      
      this.reset = () => {
         decorators = [];
         deltaDecorations();
      }
      
      this.reset();
   }
}

export default DecoratorMapper;
