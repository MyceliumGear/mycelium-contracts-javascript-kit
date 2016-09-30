var _ = require('lodash');
/**
 * @desc
 * A simple logger that wraps the <tt>console.log</tt> methods when available.
 *
 * Usage:
 * <pre>
 *   log = new Logger('mycelium');
 *   log.setLevel('info');
 *   log.debug('Message!'); // won't show
 *   log.setLevel('debug');
 *   log.debug('Message!', 1); // will show '[debug] mycelium: Message!, 1'
 * </pre>
 *
 * @param {string} name - a name for the logger. This will show up on every log call
 * @constructor
 */
var Logger = function(name) {
  this.name = name || 'log';
  this.level = 2;
};

Logger.prototype.getLevels = function() {
  return levels;
};


var levels = {
  'debug': 0,
  'info': 1,
  'log': 2,
  'warn': 3,
  'error': 4,
  'fatal': 5
};

_.each(levels, function(level, levelName) {
  Logger.prototype[levelName] = function() {
    if (level >= levels[this.level]) {
      var str = '[' + levelName + (caller || '') + '] ' + arguments[0],
        extraArgs,
        extraArgs = [].slice.call(arguments, 1);
      if (console[levelName]) {
        extraArgs.unshift(str);
        console[levelName].apply(console, extraArgs);
      } else {
        if (extraArgs.length) {
          str += JSON.stringify(extraArgs);
        }
        console.log(str);
      }
    }
  };
});

/**
 * @desc
 * Sets the level of a logger. A level can be any bewteen: 
 * 'debug', 'info', 'log', 'warn', 'error', and 'fatal'. 
 */
Logger.prototype.setLevel = function(level) {
  this.level = level;
};


var logger = new Logger('mycelium-contracts');
logger.setLevel('fatal');
module.exports = logger;