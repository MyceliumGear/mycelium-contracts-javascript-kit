var MyceliumContracts = require('../lib');
var sinon = require('sinon');

describe("Authentication", function() {

  var myceliumContracts = new MyceliumContracts({baseUrl : ''});

  var sandbox;

  beforeEach(function () {
      sandbox = sinon.sandbox.create();   
  });

  afterEach(function () {
      sandbox.restore();      
  });
    
  
  it("successful register", function() {        
    var setItemSpy = sandbox.spy(window.sessionStorage, "setItem");

    var requestStub = sandbox.stub(myceliumContracts, '_requestWrapper');

    var registerStub = requestStub.withArgs('/register', sinon.match.any);
    registerStub.yields(null, {statusCode : 200, header : {}}, {success: true, salt: "23234239023905734098"});
  
    var keyUpload = requestStub.withArgs('/key',sinon.match.any);
    keyUpload.yields(null, {statusCode : 201}, {});

    myceliumContracts.register('username','password', function(result) {
      assert(result.success == true);
      assert(keyUpload.called, 'Key upload not called');
      assert(setItemSpy.called, 'Session storage callback not called');       
    }); 
    
  });

  it("Login failure", function() {        
    var callback = sandbox.spy();

    var requestStub = sandbox.stub(myceliumContracts, '_requestWrapper');
    var errorMessage = "The user with given credentials does not exist";
    requestStub.withArgs('/login', sinon.match.any).yields(null, {statusCode : 200, header : {}},{success: false, message : errorMessage}); 

    myceliumContracts.login('username','password', function(result) {
      assert(result.success == false);
      assert(result.message == errorMessage, "Incorrect error message");    
    });
  });  

  it("Login success", function() {        
    var callback = sandbox.spy();

    var requestStub = sandbox.stub(myceliumContracts, '_requestWrapper');
    requestStub.withArgs('/login', sinon.match.any).yields(null, {statusCode : 200, header : {}},{success: true, salt: "23234239023905734098"});  

    var keyUpload = requestStub.withArgs('/key',sinon.match.any);
    keyUpload.yields(null, {statusCode : 201}, {});

    myceliumContracts.login('username','password', function(result) {
      assert(result.success == true);   
    });
  });  

});
