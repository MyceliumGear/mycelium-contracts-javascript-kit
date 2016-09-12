var path = require('path');

module.exports = {
	entry: './index.js',
	output: {
		path: path.join(__dirname, 'build'),
		filename : 'je.js'
	},
    resolve : {
        extensions : ['', '.js', '.jsx'],
        alias      : {crypto: require.resolve('crypto-browserify'),
                  "diffie-hellman": require.resolve('diffie-hellman/browser')}
       },
    module: {
       loaders: [
          {test: /\.json$/, loader: "json-loader"}
       ]
   }
};
