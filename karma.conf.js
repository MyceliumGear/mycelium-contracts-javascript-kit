module.exports = function(config) {
  config.set({
    files : [      
      './tests/**/*.js'
    ],
    frameworks : ['mocha', 'sinon-chai', 'chai-as-promised', 'chai'],    
    browsers : ['PhantomJS'],   
    singleRun: true,
    preprocessors : {      
      [`./lib/**/*.js`] : ['webpack'],
      [`./tests/**/*.js`] : ['webpack']
    },
    webpack : {
      devtool : 'inline-source-map',
      resolve : {
        extensions : ['', '.js', '.jsx'],
        alias      : {crypto: require.resolve('crypto-browserify'),
                  "diffie-hellman": require.resolve('diffie-hellman/browser')}
      },
      module  : {
       loaders: [
          {test: /\.json$/, loader: "json-loader"}
        ]
      }
    },
    webpackMiddleware : {
      noInfo : true
    },    
    plugins : [
      require('karma-webpack'),
      require('karma-mocha'),
      require('karma-chai'),
      require('karma-chai-as-promised'),
      require('karma-sinon-chai'),
      require('karma-coverage'),
      require('karma-phantomjs-launcher'),
      require('karma-spec-reporter')
    ]    
  });
};
