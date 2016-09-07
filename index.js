var Client = require('./lib');

module.exports = Client;

// Grab an existing namespace object, or create a blank object
// if it doesn't exist
var Mycelium = window.Mycelium || {};

// Stick on the modules that need to be exported.
// You only need to require the top-level modules, browserify
// will walk the dependency graph and load everything correctly
Mycelium.MyceliumMultisig = Client;

// Replace/Create the global namespace
window.Mycelium = Mycelium;