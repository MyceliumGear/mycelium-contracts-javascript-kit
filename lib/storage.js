
/**
 * @desc
 * A key/value storage for data persistence
*/

function Storage() {
};


Storage.prototype.put = function(key, value) {
  sessionStorage.setItem(key, value);
}

Storage.prototype.get = function(key) {
  return sessionStorage.getItem(key);
}

var storage = new Storage();
module.exports = storage;
