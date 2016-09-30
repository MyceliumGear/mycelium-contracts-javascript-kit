'use strict';

var log = require('./log');
var bitcore = require('bitcore-lib');
var buffer = require('buffer');
var aesjs = require('aes-js');
var scrypt = require ('scrypt-async');
var base64 = require('base64-js');
var request = require('browser-request');
var crypto = require('crypto');
var storage = require('./storage');

/**
 * @desc MyceliumContracts constructor.
 *
 * @param {Object} opts
 * @constructor
 */
function MyceliumContracts(opts) {
  opts = opts || {};
  
  this.HTTP_REQUEST_SUCCESS_CODE = 0;
  this.HTTP_REQUEST_FAILURE_CODE = 1;
  this.HTTP_REQUEST_UNKNOWN_ERROR_CODE = 2;
  this.HTTP_ECONNRESET_ERROR_CODE = 3;

  this.ERROR_AUTH_REQUEST_MESSAGE = "Error processing authentication request";
  this.ERROR_UPLOAD_KEY_REQUEST_MESSAGE = "Error processing upload key request";
  this.KEY_ENCRYPTION_ERROR_MESSAGE = "Key encryption error";

  this.verbose = opts.verbose;  
  this.request = opts.request || request;
  this.baseUrl = opts.baseUrl;                    //URL for making requests
  this.timeout = opts.timeout || 50000;           //Request timeout is set to 50 seconds by default
  this.loggedIn = false;

  if (opts.logLevel) 
    log.setLevel(opts.logLevel);
 
  //When Joint Escrow is in test mode, we should switch defaultNetwork to testNet for appropriate keys generation
  if (opts.testMode)       
    bitcore.Networks.defaultNetwork = bitcore.Networks.testnet;
};

/**
 * @desc Initialize websocket connection to receive notifictions
 * @private 
 *
 */

MyceliumContracts.prototype._initNotifications = function() {

  this.ws = new WebSocket(this.baseUrl.replace("http","ws") + "/common-events");
 
  this.ws.onmessage = function(event) {      
  };  
}

/**
 * @desc Make an HTTP request to the specific url
 * @private 
 * @param {String} url to open
 * @param {Object} arguments
 * @param {Callback} callback
 *
 */

MyceliumContracts.prototype._doRequest = function(url, args, callback) {
 var self = this;

 this._requestWrapper(url, args, function(err, res, body) {
   //Hadling abnormal situations - unknown errors
    if (!res || !res.statusCode) {
      return callback({requestResultCode : self.HTTP_REQUEST_UNKNOWN_ERROR_CODE});
    }

    if (res.statusCode >= 400) {
      return callback({requestResultCode : self.HTTP_REQUEST_FAILURE_CODE, statusCode: res.statusCode, response : body, header : res.header});
    } 
    //Handling situation when the connection has been reset by peer
    if (body === '{"error":"read ECONNRESET"}')
      return callback({requestResultCode : self.HTTP_ECONNRESET_ERROR_CODE, statusCode: res.statusCode});

    //Successful execution 
    return callback({requestResultCode : self.HTTP_REQUEST_SUCCESS_CODE, statusCode: res.statusCode, response : body, header : res.header}); 
 });

}


/**
 * @desc Helper function to wrap request method call
 * @private 
 * @param {String} url to open
 * @param {Object} arguments
 * @param {Callback} callback
 */

MyceliumContracts.prototype._requestWrapper = function(url, args, callback) {     
  args.withCredentials = true;
  args.timeout = args.timeout || this.timeout;
  args.url = url;

  if (!args.timeout)
    args.timeout = this.timeout;

  this.request(args, callback);
}


/**
 * @desc Create new private key and upload it to the server
 * @private 
 *
 * @param {String} password
 * @param {String} salt
 * @param {Callback} callback
 */


MyceliumContracts.prototype._generateKey = function(password, salt, callback) {
  var url = this.baseUrl + '/key';

  var hd = new bitcore.HDPrivateKey();
  var pubBuf = hd.publicKey.toBuffer();
  var xpub = hd.xpubkey;
  var signature = bitcore.crypto.ECDSA.sign(bitcore.crypto.Hash.sha256(pubBuf), hd.privateKey, 'big');

  var self = this;

  scrypt(password, salt, 15, 8, 32, function(key) {    
    var aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5))
    var encryptedBytes = aesCtr.encrypt(aesjs.util.convertStringToBytes(hd.xprivkey));    

    //Create new ctr object is nesessary here
    aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5))
    var decryptedBytes = aesCtr.decrypt(encryptedBytes);

    if (aesjs.util.convertBytesToString(decryptedBytes) !== hd.xprivkey) {
      callback({success : false, message: self.KEY_ENCRYPTION_ERROR_MESSAGE});
    } else {      
      var signature64 = base64.fromByteArray(new Uint8Array(signature.toBuffer()))
      var encryptedBytes64 = base64.fromByteArray(new Uint8Array(encryptedBytes))
      storage.put('privkey', hd.xprivkey);

      self._doRequest(url, {                
        json : true,
        body : { xpub: xpub, signature: signature64, payload: encryptedBytes64 },        
      }, function(result) {         
          callback({success : true, requestResult : result})
        });
    }
  });            
}


/**
 * @desc Decrypts private key using salt and password to restore user's private key
 * @private 
 * @param {String} payload - encrypted privte key
 * @param {String} salt - salt
 * @param {String} password - user's password  
 * @param {Callback} callback
 */


MyceliumContracts.prototype._restoreKeyByPassword = function(payload, salt, password, callback) { 
  var self = this;
  
  scrypt(password, salt, 15, 8, 32, function(key) {    
    var aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
    var decryptedBytes = aesCtr.decrypt(base64.toByteArray(payload));
    var hd;
      
    try {
      hd = new bitcore.HDPrivateKey(aesjs.util.convertBytesToString(decryptedBytes));
    } catch (e) {      
      callback({success: false, errorDescription: e.message});              
    }
    
    storage.put("privkey", hd.xprivkey);
    callback({success: true});
  });
}


/**
 * @desc Encrypts password using SHA1 algorithm 
 * @private 
 * @param {Object} password - the password to encrypt
 * @returns {String} Encrypted password
 */


MyceliumContracts.prototype._encryptPassword = function (password) {
 return crypto.createHash('sha1').update(password).digest('hex');
}


/**
 * Processing authentication response from server 
 * @private 
 * @param {Object} response - Response object 
 * @param {String} password - password  
 * @param {Callbck} callback
 * @private 
 */


MyceliumContracts.prototype._processSuccessAuthRequest = function(response, password, callback) {
  var self = this;

  if (response.payload == null) {             
    self._generateKey(password, response.salt, function(genKeyResult) {   
        callback(genKeyResult);      
    });   
  } else { //Payload is returned from server           
     self._restoreKeyByPassword(response.payload, response.salt, password, function(restoreKeyResult) {
       callback(restoreKeyResult)
     });                
  } 
}   


/**
 * Makes login by given username and password. 
 * @param {String} username - User name.
 * @param {String} password - User password.
 * @param {Callback} callback 
 */

MyceliumContracts.prototype._formatHttpErrorMessage = function (message, statusCode) {
  var msg = message;
  if (statusCode)
    msg += " - HTTP code ";
  msg += statusCode.toString();      
  return msg; 
}


/**
 * Makes login by given username and password. 
 * @param {String} username - User name.
 * @param {String} password - User password.
 * @param {Callback} callback 
 */


MyceliumContracts.prototype.login = function(username, password, callback) {    

  var url = this.baseUrl + '/login';
  var self = this;

  var passHash = self._encryptPassword(password); 
  
  self._doRequest(url, {
      method : 'POST',    
      json : true,      
      form : {username : username, passHash : passHash}
    }, 
    function(authRequestResult) {          
      if (authRequestResult.requestResultCode == self.HTTP_REQUEST_SUCCESS_CODE) {
        if (authRequestResult.response.success) {
          self._processSuccessAuthRequest(authRequestResult.response, password, callback);
       } else { //Server returned failure
         callback({success : false, message: authRequestResult.response.message});
       }
      } else { //Error occured while processing request                
         callback({success : false, message: self._formatHttpErrorMessage(self.ERROR_AUTH_REQUEST_MESSAGE, authRequestResult.statusCode)});       
      }
    });
};


/**
 * Checks whether the user is currently logged it.
 * Determined by existence of private key in the storage.
 * @returns {boolean}
 */


MyceliumContracts.prototype.isLoggedIn = function() {
  return storage.get('privkey') != null;
}


/**
 * Registers a new user.
 * @param {String} username - User name.
 * @param {String} password - User password.
 * @param {Callback} callback
 */


MyceliumContracts.prototype.register = function(username, password, callback) {
  var url = this.baseUrl + '/register'; 
  var self = this;

  var passHash = self._encryptPassword(password); 
  
  self._doRequest(url, {        
    method : 'POST',   
    json : true,      
    form : {username : username, passHash : passHash}, 
   }, function(regRequestResult) {         
      if (regRequestResult.requestResultCode == self.HTTP_REQUEST_SUCCESS_CODE) {         
        if (regRequestResult.response.success) {
          self._processSuccessAuthRequest(regRequestResult.response, password, callback);
       } else { //Server returned failure         
         callback({success : false, message: regRequestResult.response.message});
       }
      } else { //Error occured while processing request                
         callback({success : false, message: self._formatHttpErrorMessage(self.ERROR_AUTH_REQUEST_MESSAGE, regRequestResult.statusCode)});       
      }
    }
  ); 
};


/**
 * Requests a limited list of contracts from JE Server
 * @param {Integer} limit - maximum number of contracts
 * @param {Callback} callback
 */

MyceliumContracts.prototype.getContracts = function(limit, callback) {
  var url = this.baseUrl + '/contracts/limit/' + limit.toString();
  
  this._doRequest(url, {        
    method : 'GET'
   }, callback);
}


module.exports = MyceliumContracts;
