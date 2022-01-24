// gets JSX expressions within a Babel's AST
export const collectJSXExpressions = (ast, traverse, traverseOptions = {}) => {
   const jsxExpressions = [];
   
   const enter = (path) => {
      if (path.type.toUpperCase().includes("JSX")) {
         jsxExpressions.push(path);
      }
   }
   
   traverse(ast, {...traverseOptions, enter});
   
   return jsxExpressions;
}

export const isJSXIdentifier = (path) => {
   return (path && (
         path.key === 'object' ||
         path.key === 'property' ||
         path.key === 'name' ||
         path.key === 'namespace'
      )
   );
}

export const isParentJSXAttribute = (path) => {
   return (
      path &&
      path.parentPath &&
      path.parentPath.isJSXAttribute()
   );
};

export const getLoc = (path) => {
   return (path && path.node && path.node.loc);
};

export const cloneLoc = (path) => {
   const loc = getLoc(path);
   
   if (!loc) {
      return null;
   }
   
   return {
      start: {...loc.start},
      end: {...loc.end}
   };
   
};

// prevents spilling highlighting on objects props
export const getCuratedLoc = (path) => {
   const loc = cloneLoc(path);
   
   if (!loc) {
      return [null, null, null, null];
   }
   
   if (path.key === 'object' && path.container) {
      loc.end = {...path.container.property.loc.start};
   }
   
   return loc;
   
};

export const extractJSXOpeningElement = (path) => {
   const loc = getLoc(path);
   
   if (!loc) {
      return [null, null, null, null];
   }
   
   const openingElement = path.node.openingElement;
   
   if (!openingElement) {
      return [null, null, null, null];
   }
   
   const elementName = openingElement.name.name;
   
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
   
   return [openingElement, elementName, startLoc, endLoc];
};

export const extractJSXClosingElement = (path) => {
   const loc = getLoc(path);
   
   if (!loc) {
      return [null, null, null, null];
   }
   
   const closingElement = path.node.closingElement;
   
   if (!closingElement) {
      return [null, null, null, null];
   }
   
   const elementName = closingElement.name && closingElement.name.name;
   
   const startLoc = {
      start: {...closingElement.loc.start},
      end: {...closingElement.name.loc.start}
   };
   
   const endLoc = {
      start: {...closingElement.loc.end},
      end: {...closingElement.loc.end}
   };
   endLoc.start.column--;
   
   return [closingElement, elementName, startLoc, endLoc];
};

export const extractJSXExpressionEdges = (path) => {
   const loc = getLoc(path);
   
   if (!loc) {
      return [null, null, null, null];
   }
   
   let innerNode = null;
   let innerLocKey = path.isJSXSpreadChild() ? 'expression'
      : path.isJSXSpreadAttribute() ? 'argument'
         : null;
   
   let innerLoc = null;
   
   if (innerLocKey) {
      innerNode = path.node[innerLocKey];
      
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
   return [innerNode, innerLocKey, startEdgeLoc, endEdgeLoc];
};
