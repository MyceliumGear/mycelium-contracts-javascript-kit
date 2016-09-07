var path = require('path');

module.exports = {
	entry: './index.js',
	output: {
		path: path.join(__dirname, 'build'),
		filename : 'je.js'
	},
	module: {
    loaders: [
      {test: /\.json$/, loader: "json-loader"}
    ]
  },	
};
