# mycelium-multisig-client


The *official* client library for Mycelium Joint Escrow. 

## Description

This package communicates with Joint Escrow Server using the REST API. All REST endpoints are wrapped as simple async methods.

## Class MyceliumMultisig

Contains a set of methods for managing escrow contracts. Communicates with Joint Escrow backend by sending and receiving events. Maintaining actual contracts’ state to provide up-to-date information to user in form of callbacks.

### Authentication

The authentication methods are described.

#### MyceliumMultisig.login(email, password, callback)

Makes user authorization on JE server. Receives JWT token on success and stores the token locally. A private key is created and stored locally. Calculates password hash using SHA-256 algorithm and transmits it to the server.

Parameters:

 * login - new user’s login
 * password - new user’s password
 * callback - callback function that returns an error description or nothing on success.

Return values inside callback function:

 * error - a message indicating a problem in case of failure. Takes null value if succeeded. The possible failure messages:
   * “The user with given credentials does not exist”
   * “Unexpected error occurred. Please try again later”

#### MyceliumMultisig.register(email, password, callback)

Creates a new user on JE server. Receives JWT token on success and stores the token locally.
Calculates password hash using SHA-256 algorithm and transmits it to the server.

Parameters:

 * login - new user’s login
 * password - new user’s password
 * callback - callback function that returns an error description or nothing on success.

Return values inside callback function:

 * error  - a message indicating a problem in case of failure. Takes null value if succeeded. The possible failure messages:
   * “The user with following credentials already exists”
   * “Unexpected error occurred. Please try again later”


### Contract and funds management

Methods aimed to create contracts.

#### MyceliumMultisig.createContract(title, terms, callback)

Creates a new contract. Receives a callback function that holds a new map that contains new contract properties.

Parameters:

 * title - contract title
 * terms - contract terms
 * callback - callback function that returns an error description or map with object parameters

Return values inside callback function:

 * error - a message indicating a problem in case of failure. Takes null value if succeeded.
 * contract - a map consisting of new contract’s properties:
   * contractId - contract identifier
   * title - contract title
   * terms - contract terms
   * status - contract status
   * fundingAddress - address to sentAmount funds
   * releaseAddress - address where funds are released to
   * lockedFundingAddress - multisign address that contains locked funds
   * fundingUrl - full URL that contains value and address

#### MyceliumMultisig.addCounterparty(contractId, counterparty, callback)

Adds a counterparty to the contract. Balance of sent and released amounts are verified to fulfill the following condition:


Parameters:

 * contractId - contract identifier
 * counterparty - a map of counterparty parameters:
 * sentAmount - an amount should be sent by the counterparty.
 * receivedAmount - a sum is awaited to be received by the counterparty after the contract is released.
 * payFee - is counterparty take fee.
 * email - counterparty email
 * callback - callback function that returns an error description or map with object parameters

Return values inside callback function:

 * error - a message indicating a problem in case of failure. Takes null value if succeeded. The possible failure messages:
   * “Incorrect contract identifier”
   * “Incorrect balance of sentAmount and released amounts”
 * counterparty - a map consisting of new counterparty’s parameters
   * contractId - contract id
   * counterpartyId - counterparty identifier.
   * sentAmount - counterparty sentAmount (including miner’s fee).
   * payFee - is counterparty take fee.
   * email - counterparty email.
   * receivedAmount  - a sum is awaited to be received by the counterparty after the contract is released

#### MyceliumMultisig.removeCounterparty(contractId, counterpartyId, callback)

Removes the counterparty from the contract. Balance of sentAmount and released amounts are verified.

Parameters:

 * contractId - contract identifier
 * counterpartyId - counterparty identifier.
 * callback - callback function that returns an error description

Return values inside callback function:

 * error - a message indicating a problem in case of failure. Takes null value if succeeded. The possible failure messages:
  * “Incorrect contract identifier”
  * “The contract doesn’t contain the specified counterpartyId”

#### MyceliumMultisig.getContracts(callback)

Receives all contracts where the current user is creator or involved into as counterparty.

Parameters:
 * callback - callback function that returns an error description or contracts list

Return values inside callback function:

 * contracts - a list of contracts:
 * title - contract title
 * terms - contract terms
 * counterparties - a list of counterparties:
 * counterpartyId - counterparty identifier.
 * sentAmount - counterparty sentAmount (including miner’s fee).
 * payFee- is counterparty take fee.
 * email - counterparty email.
 * receivedAmount  - a sum is awaited to be received by the counterparty after the contract is released
 * status - contract status
 * fundingAddress - address to sentAmount funds
 * releaseAddress - address where funds are released to
 * lockedFundingAddress - multisign address that contains locked funds
 * fundingUrl - full URL that contains sentAmount value and address
 * fees - common contract’s fees (JE Fee + counterparty_cnt * 3 * miner_fee_unit) Returned to contract’s author or the person who is responsible to take fees.
 * owner - contract owner’s information

#### MyceliumMultisig.getContract(contractId, callback)

Receives contract information by given contract identifier.

Parameters:
 * contractId - contract identifier
 * callback - callback function that returns an error description or map with contract parameters

Return values inside callback function:

 * error - a message indicating a problem in case of failure. Takes null value if succeeded. The possible failure messages:
   * “Incorrect contract identifier”
 * contract - a map with contract properties:
   * title - contract title
   * terms - contract terms
   * counterparties - a list of counterparties:
   * counterpartyId - counterparty identifier.
   * sentAmount - counterparty sentAmount (including miner’s fee).
   * payFee- is counterparty take fee.
   * email - counterparty email.
   * receivedAmount  - a sum is awaited to be received by the counterparty after the contract is released
   * status - contract status
   * fundingAddress - address to sentAmount funds
   * releaseAddress - address where funds are released to
   * lockedFundingAddress - multisign address that contains locked funds
   * fundingUrl - full URL that contains sentAmount value and address
   * fees - common contract’s fees (JE Fee + counterparty_cnt * 3 * miner_fee_unit) Returned to contract’s author or the person who is responsible to take fees.
   * owner - contract owner’s information

#### MyceliumMultisig.acceptContractConditions(contractId, callback)

Notifies that contract conditions are accepted by current user.

Parameters:
 * contractId - contract identifier
 * callback - callback function that returns an error description or map with object parameters

 Return values inside callback function:

 * error - a message indicating a problem in case of failure. Takes null value if succeeded. The possible failure messages:
   * “Incorrect contract identifier”

#### MyceliumMultisig.createContractProposal(contractId, counterparties, callback)

Creates a contract proposal for the counterparty. Allowed to be called by contract creator.

Parameters:
 * contractId - contract identifier.
 * counterparties - list of amounts proposed to return to each counterparty. It contains:
 * counterpartyId - counterparty identifier
 * releasedToCounterparty - proposed amount release to counterparty
 * callback - callback function that returns an error description or map with object parameters

Return values inside callback function:

 * error - a message indicating a problem in case of failure. Takes null value if succeeded. The possible failure messages:
   * “Incorrect contract identifier”
   * “The contract does not contain a counterparty with specified identifier”
   * “Incorrect released amount”
 * proposal - a map of proposal properties returned:
   * proposalId - proposal identifier.
   * contractId - contract identifier.
   * counterparties - list of amounts proposed to return to each counterparty. It contains:
   * counterpartyId - counterparty identifier
   * releasedToCounterparty - proposed amount release to counterparty

#### MyceliumMultisign.getContractProposals(contractId, callback)

Returns a list of proposals provided by counterparties.

Parameters:

 * contractId - contract identifier
 * callback - callback function that returns an error description or map with object parameters

Return values inside callback function:

 * error - a message indicating a problem in case of failure. Takes null value if succeeded.  The possible failure messages:
   * “Incorrect contract identifier”
 * proposals - list of available proposals objects:
   * proposalId - proposal identifier
   * counterparties - list of amounts proposed to return to each counterparty. It contains:
   * counterpartyId - counterparty identifier
   * releasedToCounterparty - proposed amount release to counterparty

#### MyceliumMultisign.acceptContractProposal(proposalId, callback)

Sends notification about accepting the specific proposal to server.

Parameters:

 * proposalId - identifier of proposal
 * callback - callback function that returns an error description or map with object parameters

Return values inside callback function:

 * error - a message indicating a problem in case of failure. Takes null value if succeeded. The possible failure messages:
   * “Incorrect proposal identifier”

#### MyceliumMultisign.withdrawFunds(address, callback)

Makes funds withdraw to the specific address

Parameters:

 * address - address to withdraw funds from release address
 * callback - callback function that returns an error description or map with object parameters.

Return values inside callback function:

 * error - a message indicating a problem in case of failure. Takes null value if succeeded. The possible failure messages:
   * “Incorrect address for withdraw”

### Event handlers

#### MyceliumMultisign.onSignInRequired()

Callback function defined by the user. Accepts callback indicating that an encryption password should be provided by user.

### MyceliumMultisign.onCounterpartyInvolved(contractId, counterpartyId)

Callback function defined by the user. Accepts callback indicating that the counterparty is involved into contract.

Callback input parameters:

 * contractId - contract identifier
 * counterpartyId - counterparty identifier

#### MyceliumMultisign.onFundsSentByCounterparty(contractId, counterpartyId)

Callback function defined by the user. Called when the necessary amount has been transferred to funding address.

Callback input parameters:

 * contractId - contract identifier
 * counterpartyId - counterparty identifier

#### MyceliumMultisign.onFundsLocked(contractId)

Callback function defined by the user. Called when amounts are funded and locked inside multi-signed address.

Callback input parameters:

 * contractId - contract identifier
 * lockedFundingAddress - multisign address that contains locked funds

#### MyceliumMultisign.onNewProposalArrived(contractId, proposal)

Callback function defined by the user. Called when a new proposal arrives.

Callback input parameters:

 * contractId - contract identifier
 * proposal - a map containing new proposal properties:
 * Id - proposal identifier
 * counterparties - list of amounts proposed to return to each counterparty. It contains:
 * counterpartyId - counterparty identifier
 * releasedToCounterparty - proposed amount release to counterparty

#### MyceliumMultisign.onProposalAcceptedByCounterparty(contractId, counterpartyId, proposal)

Callback function defined by the user. Called when a counterparty accepts the specific proposal.

Callback input parameters:

 * contractId - contract identifier
 * counterpartyId - counterparty identifier
 * proposal - a map containing the proposal properties:
 * Id - proposal identifier
 * counterparties - list of amounts proposed to return to each counterparty. It contains:
 * counterpartyId - counterparty identifier
 * releasedToCounterparty - proposed amount release to counterparty

#### MyceliumMultisign.onFundsUnlocked(contractId, releaseAddress)

Callback function defined by the user. Called when counterparties are agreed on release conditions and funds are released to corresponding funding addresses.

Parameters:

 * contractId - contract identifier
 * releaseAddress - address to which funds were transferred to.