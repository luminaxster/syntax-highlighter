// now using rollup
const path  = require('path');

module.exports = function () {
   const devMode = true;//!env.production;
   
   return {
      mode: devMode ? 'development' : 'production',
      entry: path.resolve(__dirname, 'src/index.js'),
      output: {
         path: path.resolve(__dirname, 'build'),
         publicPath: 'build/',
         filename: 'monaco-jsx-highlighter.js',
         sourceMapFilename: 'monaco-jsx-highlighter.map',
         library: 'MonacoJSXHighlighter',
         libraryTarget: 'umd',
      },
      module: {
         rules: [
            {
               test: /\.(js|jsx)$/i,
               exclude: /node_modules/,
               use: {
                  loader: "babel-loader",
               }
            },
            {
               test: /\.css$/i,
               exclude: /node_modules/,
               use: [
                  'style-loader',
                  'css-loader'
               ]
            },
            {
               test: /\.(png|jpg|gif)$/i,
               exclude: /node_modules/,
               use: {
                  loader: 'url-loader',
                  options: {
                     limit: 8192
                  }
               }
            }
         ],
      },
      resolve: {
         extensions: ['.js']
      },
   }
};
