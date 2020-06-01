let monaco = null, j = null;

const defaultOptions = {
    isHighlightGlyph: false,
    iShowHover: false,
    isUseSeparateElementStyles: false,
};

const HIGHLIGHT_SCOPE = {
    ALL: 'ALL',
    IDENTIFIER: 'IDENTIFIER',
    LOCAL: 'LOCAL',
    EXTRA: 'EXTRA',
};

export const JSXTypes = {
    JSXBracket: {
        highlightScope: HIGHLIGHT_SCOPE.LOCAL,
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
    JSXOpeningElement: {
        highlightScope: HIGHLIGHT_SCOPE.IDENTIFIER,
        options: {
            inlineClassName: 'mtk101.Identifier.JsxOpeningElement.Identifier',
        },
    },
    JSXClosingElement: {
        highlightScope: HIGHLIGHT_SCOPE.IDENTIFIER,
        options: {
            inlineClassName: 'mtk102.Identifier.JsxClosingElement.Identifier ',
        },
    },
    JSXAttribute: {
        highlightScope: HIGHLIGHT_SCOPE.IDENTIFIER,
        options: {
            inlineClassName: 'mtk103.Identifier.JsxAttribute.Identifier ',
        },
    },
    JSXText: {
        highlightScope: HIGHLIGHT_SCOPE.ALL,
        options: {
            inlineClassName: 'mtk104.JsxElement.JsxText',
        },
    },
    JSXElement: {
        highlightScope: HIGHLIGHT_SCOPE.EXTRA,
        options: (elementName) => (
            {
                glyphMarginClassName: 'mtk105.glyph.Identifier.JsxElement',
                glyphMarginHoverMessage:
                    `JSX Element${elementName ? ': ' + elementName : ''}`
            }
        ),
    },
};

export const configureLocToMonacoRange = (_monaco = monaco, parser = 'babylon') => {
    switch (parser) {
        case 'babylon':
        default:
            return (
                loc,
                startLineOffset = 0,
                startColumnOffset = 0,
                endLineOffset = 0,
                endColumnOffset = 0,
            ) => {
                if (!loc || !loc.start) {
                    return new _monaco.Range(1, 1, 1, 1);
                }
                return new _monaco.Range(
                    startLineOffset + loc.start.line,
                    startColumnOffset + loc.start.column + 1,
                    endLineOffset + loc.end ? loc.end.line : loc.start.line,
                    endColumnOffset + loc.end ? loc.end.column + 1 : loc.start.column + 1,
                );
            };
    }
};

class MonacoJSXHighlighter {
    constructor(
        monacoRef,
        jRef,
        monacoEditor,
        options = {},
    ) {
        monaco = monacoRef;
        j = jRef;
        this.locToMonacoRange = configureLocToMonacoRange(monaco);
        this.monacoEditor = monacoEditor;
        this.options = {...defaultOptions, ...options};
    }

    getAstPromise = () => new Promise((resolve) => {
        resolve(j(this.monacoEditor.getValue()));
    });

    highLightOnDidChangeModelContent = (
        afterHighlight = ast => ast,
        onError = error => console.error(error),
        getAstPromise = this.getAstPromise,
        onJsCodeShiftErrors = error => console.log(error),
    ) => {
        this.highlightCode(afterHighlight, onError, getAstPromise, onJsCodeShiftErrors);

        let highlighterDisposer = this.monacoEditor.onDidChangeModelContent(
            () => this.highlightCode(afterHighlight, onError, getAstPromise, onJsCodeShiftErrors)
        );
        return () => {
            if (!highlighterDisposer) {
                return;
            }
            highlighterDisposer.dispose();
            this.monacoEditor.deltaDecorations(
                this.JSXDecoratorIds || [],
                [],
            );
            highlighterDisposer = null;
        };
    };

    highlightCode = (
        afterHighlight = ast => ast,
        onError = error => console.error(error),
        getAstPromise = this.getAstPromise,
        onJsCodeShiftErrors = error => error,
    ) =>
        (
            getAstPromise()
                .then(ast => this.highlight(ast))
                .catch(onJsCodeShiftErrors)
        )
            .then(afterHighlight)
            .catch(onError);

    highlight = (ast) => {
        return new Promise((resolve) => {
            if (ast) {
                const decorators = this.createJSXElementDecorators(ast);
                for (const jsxType in JSXTypes) {
                    this.createDecoratorsByType(
                        ast,
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
                resolve(ast);
            }
        });

    };

    createJSXElementDecorators = (
        ast,
        decorators = [],
        highlighterOptions = this.options,
    ) => {
        ast
            .findJSXElements()
            .forEach(p => {
                const loc = p.value.loc;
                const openingElement = p.value.openingElement;
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
                            oLoc.end.column + (openingElement.selfClosing ? -1 : 0),
                            oLoc.end.line,
                            oLoc.end.column + 1
                        ),
                        options: highlighterOptions.isUseSeparateElementStyles ?
                            JSXTypes.JSXBracket.openingElementOptions
                            : JSXTypes.JSXBracket.options,
                    });
                }
                const closingElement = p.value.closingElement;
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

    createDecoratorsByType = (
        ast,
        jsxType,
        jsxTypeOptions,
        highlightScope,
        decorators = [],
        highlighterOptions = this.options,
    ) => {
        switch (highlightScope) {
            case HIGHLIGHT_SCOPE.IDENTIFIER:
                ast.find(j[jsxType])
                    .find(j.JSXIdentifier)
                    .forEach(p => {
                        const loc = p.value.loc;
                        const options = highlighterOptions.iShowHover ?
                            {...jsxTypeOptions, ...{hoverMessage: `(${jsxType})`}}
                            : jsxTypeOptions;
                        decorators.push({
                            range: this.locToMonacoRange(loc),
                            options
                        });
                    });
                break;

            case HIGHLIGHT_SCOPE.ALL:
                ast.find(j[jsxType])
                    .forEach(p => {
                        const loc = p.value.loc;
                        const options = highlighterOptions.iShowHover ?
                            {...jsxTypeOptions, ...{hoverMessage: `(${jsxType})`}}
                            : jsxTypeOptions;
                        decorators.push({
                            range: this.locToMonacoRange(loc),
                            options
                        });
                    });
        }

        return decorators;
    };
}

export default MonacoJSXHighlighter;