module.exports = function (config) {
  config.set({
    basePath: "",
    frameworks: ["mocha", "chai"],
    files: [{
        pattern: "src/*.ts",
        type: "module",
        included: false
      },
      {
        pattern: "test/*.test.ts",
        type: "module"
      },
      {
        pattern: "test/assets/*.*",
        included: false,
        served: true,
        nocache: true
      },
    ],
    preprocessors: {
      "src/*.ts": ["typescript"],
      "test/*.ts": ["typescript"]
    },
    reporters: ["spec", "coverage"],
    coverageReporter: {
      reporters: [{
          type: "html",
          dir: "coverage",
          subdir: function (browser) {
            // normalization process to keep a consistent browser name across different
            // OS
            return browser.toLowerCase().split(/[ /-]/)[0];
          }
        },
        {
          type: "text"
        }
      ]
    },
    port: 9876, // karma web server port
    colors: true,
    logLevel: config.LOG_INFO,
    browsers: ["ChromeHeadless", "Chrome", "Firefox"],
    autoWatch: false,
    singleRun: true,
    concurrency: Infinity,
    proxies: {
      "/assets/": "/base/test/assets/"
    },
    // urlRoot: "/test",
    // plugins: [
    //   "karma-chrome-launcher",
    //   "karma-typescript-preprocessor"
    // // ],
    // karmaTypescriptConfig: {
    //   compilerOptions: {
    //     ...require("./tsconfig.json").compilerOptions
    //   },
    //   include: [
    //     './src/*.ts',
    //     './test/*.test.ts',
    //   ],
    //   // bundlerOptions: {
    //   //     transforms: [
    //   //         require('karma-typescript-es6-transform')()
    //   //     ],
    //   //     entrypoints: /\.spec\.ts$/,
    //   // }
    // },
    typescriptPreprocessor: {
      // options passed to the typescript compiler
      options: {
        ...require("./tsconfig.json").compilerOptions
      },
      // options: {
      //   sourceMap: false, // (optional) Generates corresponding .map file.
      //   target: "ES5", // (optional) Specify ECMAScript target version: 'ES3' (default), or 'ES5'
      //   module: "umd", // (optional) Specify module code generation: 'commonjs' or 'amd'
      //   noImplicitAny: true, // (optional) Warn on expressions and declarations with an implied 'any' type.
      //   noResolve: true, // (optional) Skip resolution and preprocessing.
      //   removeComments: true, // (optional) Do not emit comments to output.
      //   concatenateOutput: false // (optional) Concatenate and emit output to single file. By default true if module option is omited, otherwise false.
      // },
      // // transforming the filenames
      transformPath: function (path) {
        return path.replace(/\.ts$/, ".js");
      }
    }
  });
};
