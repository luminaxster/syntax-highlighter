/**
 * Adapted from https://github.com/reduxjs/redux/blob/master/rollup.config.js
 * Copyright (c) 2015-present Dan Abramov
 */

import nodeResolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import cleanup from 'rollup-plugin-cleanup';
import postcss from "rollup-plugin-postcss";
import {terser} from 'rollup-plugin-terser';

const isProduction = true;

export default [
   {
      input: 'src/index.js',
      output:
         [
            {
               file: 'dist/cjs/monaco-jsx-highlighter.js',
               format: 'cjs',
               indent: false,
               sourcemap: true,
               exports: 'named',
            },
            {
               file: 'dist/cjs/monaco-jsx-highlighter.min.js',
               format: 'iife',
               name: 'version',
               exports: 'named',
               plugins: [terser()]
            }
         ],
      external: ['is-dom', 'prop-types', 'react'],
      plugins: [
         postcss({minimize: isProduction}),
         nodeResolve({
            mainFields: ['module', 'jsnext:main', 'main'],
         }),
         commonjs({
            include: 'node_modules/**',
         }),
         babel({
            babelHelpers: 'bundled'
         }),
         cleanup()
      ],
   },
   {
      input: 'src/index.js',
      output:
         [
            {
               file: 'dist/es/monaco-jsx-highlighter.js',
               format: 'es',
               indent: false,
               sourcemap: true,
               exports: 'named',
            },
            {
               file: 'dist/es/monaco-jsx-highlighter.min.js',
               format: 'iife',
               name: 'version',
               exports: 'named',
               plugins: [terser()]
            }
         ],
      external: ['is-dom', 'prop-types', 'react'],
      plugins: [
         postcss({minimize: isProduction}),
         nodeResolve({
            mainFields: ['module', 'jsnext:main', 'main'],
         }),
         commonjs({
            include: 'node_modules/**',
         }),
         babel({
            babelHelpers: 'bundled'
         }),
         cleanup()
      ],
   },
   {
      input: 'src/index.js',
      output:
         [
            {
               file: 'dist/umd/monaco-jsx-highlighter.js',
               format: 'umd',
               name: 'MonacoJSXHighlighter',
               indent: false,
               exports: 'named',
               sourcemap: true,
            },
            {
               file: 'dist/umd/monaco-jsx-highlighter.min.js',
               format: 'iife',
               name: 'version',
               exports: 'named',
               plugins: [terser()]
            }
         ],
      plugins: [
         postcss({minimize: isProduction}),
         nodeResolve({
            mainFields: ['module', 'jsnext:main', 'main'],
         }),
         babel({
            babelHelpers: 'bundled',
            exclude: 'node_modules/**',
         }),
         commonjs({
            namedExports: {
               'node_modules/react/index.js': [
                  'useContext',
                  'useLayoutEffect',
                  'useCallback',
                  'useState',
                  'useMemo',
                  'createContext',
                  'memo',
                  'Children',
               ],
            },
         }),
         cleanup()
      ],
   },
];
