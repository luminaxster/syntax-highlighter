const path  = require('path');

module.exports = function (env) {
   const devMode = !env.production;
   
   return {
      mode: devMode ? 'development' : 'production',
      entry: path.resolve(__dirname, 'src/index.js'),
      output: {
         path: path.resolve(__dirname, 'dist'),
         filename: 'index.js',
         library: '$',
         libraryTarget: 'umd',
      },
      module: {
         rules: [
            {
               test: /\.(js|jsx)$/i,
               exclude: /node_modules/,
               use: {
                  loader: "babel-loader",
                  options: {
                     presets: [
                        '@babel/preset-env',
                        '@babel/preset-react',
                     ]
                  }
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
