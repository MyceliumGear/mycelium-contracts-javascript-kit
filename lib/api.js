'use strict';

var bitcore = require('bitcore-lib');
var buffer = require('buffer');
var aesjs = require('aes-js');
var scrypt = require ('scrypt-async');
var base64 = require('base64-js');
var request = require('browser-request');

//Constants' definitions

var BASE_URL = 'http://localhost:10000/jointescrow';
var WEBSOCKET_ENDPOINT = '/common-events';
var LOGIN_ENDPOINT = '/login/';
var REGISTER_ENDPOINT = '/register/';
var CREATE_CONTRACT_ENDPOINT = '/create-contract/';
var ADD_COUNTERPARTY_ENDPOINT = '/add-counterparty/';
var GET_CONTRACT_ENDPOINT = '/get-contract/';
var PAYLOAD_ENDPOINT = '/key';
var GEAR_AUTH_ENDPOINT = '/auth/gear';
var JE_AUTH_INFO = '/auth';
var JE_INFO = '/info';
var GET_CONTRACTS_LIST_ENDPOINT = '/contracts/limit/';

var SALT = 'sd235o2i23v52oip426ophfaopia234poihgpsodopihstgo';


var PRIV_KEY_NAME = 'privkey';

/**
 * @desc MyceliumContracts constructor.
 *
 * @param {Object} opts
 * @constructor
 */
function MyceliumContracts(opts) {
  opts = opts || {};

  this.verbose = !!opts.verbose;
  this.request = opts.request || request;
  this.baseUrl = opts.baseUrl || BASE_URL;
  this.timeout = opts.timeout || 50000; //Write comments for each values!!

  this.initNotifications();
};


MyceliumContracts.prototype.initNotifications = function() {

  var ws = new WebSocket("ws://localhost:10000/jointescrow" + WEBSOCKET_ENDPOINT);

  ws.onmessage = function(event) {
      console.log(Date.now() + " " + event.data);
  };  
}

/**
 * Does an HTTP request
 * @private
 *
 * @param {Object} method
 * @param {String} url
 * @param {Object} args
 * @param {Callback} callback
 */
MyceliumContracts.prototype._ajax = function(args) {

  if (!args.withCredentials)
    args.withCredentials = true;

  if (!args.timeout)
    args.timeout = this.timeout;

  this.request(args, function(err, res, body) {    
  
    if (!res) {
      return args.callback({message : "Connection error"});
    }

    if (res.statusCode !== 200) {
      if (res.statusCode === 404)
        return args.callback({code : 404, message: "Not found"});

      if (!res.statusCode)
        return args.callback({message : "Connection error"});

      if (!body)
        return args.callback({code : res.statusCode, message : "HTTP error"});

      return args.callback({code : res.statusCode, message : 'Error in body'});
    }

    if (body === '{"error":"read ECONNRESET"}')
      return args.callback({code : 200, message : 'ECONNRESET ' + JSON.parse(body)});

    return args.callback(null, body, res.header);
  });
};

/**
 * Makes authentication using Gear token
 * @param {String} callback
 */


MyceliumContracts.prototype.authGear = function(jwtToken, callback) {  
  console.log('Calling Gear auth');
  var url = BASE_URL + GEAR_AUTH_ENDPOINT;  

  this._ajax({
    method : 'POST',
    url : url,
    json : true,
    body : jwtToken,
    callback : callback
  }); 
}

/**
 * Requests authentication info from JE server
 * @param {String} callback
 */

MyceliumContracts.prototype.authInfo = function(callback) {  
  var url = BASE_URL + JE_AUTH_INFO;  

  this._ajax({
    method : 'GET',
    url : url,
    json : true,    
    callback : callback
  });
}


/**
 * Requests settings information server
 * @param {String} callback
 */

MyceliumContracts.prototype.gearInfo = function(callback) {  
  var url = BASE_URL + JE_INFO;  

  this._ajax({
    method : 'GET',
    url : url,
    json : true,    
    callback : callback
  });
}

MyceliumContracts.prototype._putToStorage = function(key, value) {
  sessionStorage.setItem(key, value);
}

/**
 * @desc Create new private key and upload it to the server
 * @private 
 *
 * @param {String} callback
 */

MyceliumContracts.prototype._onNewPayload = function(password, callback) {
  var url = BASE_URL + PAYLOAD_ENDPOINT;

  var hd = new bitcore.HDPrivateKey();
  var pubBuf = hd.publicKey.toBuffer();
  var xpub = hd.xpubkey;
  var signature = bitcore.crypto.ECDSA.sign(bitcore.crypto.Hash.sha256(pubBuf), hd.privateKey, 'big');

  var self = this;

  scrypt(password, SALT, 15, 8, 32, function(key) {
    var aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5))
    var encryptedBytes = aesCtr.encrypt(aesjs.util.convertStringToBytes(hd.xprivkey));

    aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
    var decryptedBytes = aesCtr.decrypt(encryptedBytes);

    if (aesjs.util.convertBytesToString(decryptedBytes) !== hd.xprivkey) {
      callback('Internal error');
    } else {
      var signature64 = base64.fromByteArray(new Uint8Array(signature.toBuffer()))
      var encryptedBytes64 = base64.fromByteArray(new Uint8Array(encryptedBytes))
      
      self._ajax({
        method : 'POST',
        url : url,
        json : true,
        body : { xpub: xpub, signature: signature64, payload: encryptedBytes64 },
        callback : callback
      });
    }
  });            
}

/**
 * Decrypts payload and restore user's private key
 * @private 
 *
 * @param {String} callback
 */

MyceliumContracts.prototype._onProcessPayload = function(payload, password, callback) {
  this._putToStorage('payload', payload);
  
  scrypt(password, SALT, 15, 8, 32, function(key) {
    var aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
    var decryptedBytes = aesCtr.decrypt(base64.toByteArray(payload));
    var hd;
    
    try {
      hd = new bitcore.HDPrivateKey(aesjs.util.convertBytesToString(decryptedBytes));
    } catch (e) {
      callback('Invalid password, try again');              
    }
    
    this._putToStorage(PRIV_KEY_NAME, hd.xprivkey);
    callback(null);
  });
}

/**
 * Requests a payload from JE server 
 * @private 
 * @param {String} callback
 */

MyceliumContracts.prototype._requestPayload = function(callback) {
  var url = BASE_URL + PAYLOAD_ENDPOINT;
  return this._ajax({
    method : 'GET',
    url : url,
    callback : callback
  });
}

/**
 * Makes login
 * @param {String} username - User name.
 * @param {String} password - User password. 
 */
MyceliumContracts.prototype.login = function(username, password, callback) {
  var url = BASE_URL + LOGIN_ENDPOINT;
  var passBuf = new buffer.Buffer(password);
  var passHash = bitcore.crypto.Hash.sha256(passBuf).toString();
  var opts = {username : username, passHash : passHash};
  var self = this;

  this._ajax({
    method: 'POST',
    url : url,
    json : true,      
    form : opts, 
    callback: function(err, response) {    
      if (response.success) {
        self._requestPayload(function(err, status, responseText) {
          if (err) {
            if (err.code == 204) 
              self._onNewPayload(password, function(err, res, body) {
                callback();
              });              
          } else {            
              self._onProcessPayload(password, function(err, res, body) {
                callback();
              });
          }
        });
      }    
    }
  });
};

/**
 * Registers a new user.
 * @param {String} username - User name.
 * @param {String} password - User password. 
 */

MyceliumContracts.prototype.register = function(username, password, callback) {
  var url = BASE_URL + REGISTER_ENDPOINT;
  var passBuf = new buffer.Buffer(password);
  var passHash = bitcore.crypto.Hash.sha256(passBuf);
  var opts = {username : username, passHash : passHash};  
  this._doPostRequest(url, opts, function(response) {    
      callback(null, response);
  });
};

/**
 * Requests a limited list of contracts from JE Server
 * @param {Integer} limit - maximum number of contracts
 * @param {String} callback
 */

MyceliumContracts.prototype.getContracts = function(limit, callback) {
  var url = BASE_URL + GET_CONTRACTS_LIST_ENDPOINT + limit.toString();
  return this._ajax({
    method : 'GET',
    url : url,
    callback : callback
  });
}


module.exports = MyceliumContracts;
