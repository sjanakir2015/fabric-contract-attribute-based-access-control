/*
* Copyright IBM Corp All Rights Reserved
*
* SPDX-License-Identifier: Apache-2.0
*/
'use strict';
const express = require('express');
const utils = require('./utils.js');
const supplychainRouter = express.Router();

// Bring key classes into scope, most importantly Fabric SDK network class
const Asset = require('../../contract/lib/asset.js');

const STATUS_SUCCESS = 200;
const STATUS_CLIENT_ERROR = 400;
const STATUS_SERVER_ERROR = 500;

//  USER Management Errors
const USER_NOT_ENROLLED = 1000;
const INVALID_HEADER = 1001;

//  application specific errors
const SUCCESS = 0;
const ASSET_NOT_FOUND = 2000;

async function getUsernamePassword(request) {
    // check for basic auth header
    if (!request.headers.authorization || request.headers.authorization.indexOf('Basic ') === -1) {
        return new Promise().reject('Missing Authorization Header');  //  status 401
    }

    // get auth credentials
    const base64Credentials = request.headers.authorization.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    //  At this point, username + password could be verified for auth -
    //  but NOT BEING VERIFIED here.  Username and password are
    //  verified with Fabric-Certificate-Authority at enroll-user time.
    //  Once enrolled,
    //  certificate is retrieved from CA and stored in local wallet.
    //  After that, password will not be used.  username will be used
    //  to pick up certificate from the local wallet.

    if (!username || !password) {
        return new Promise().reject('Invalid Authentication Credentials');  //  status 401
    }

    // attach username and password to request object
    request.username = username;
    request.password = password;

    return request;
}

async function submitTx(request, txName, ...args) {
    try {
        //  check header; get username and pwd from request
        //  does NOT verify auth credentials
        await getUsernamePassword(request);
        return utils.setUserContext(request.username, request.password).then((contract) => {
            // Insert txName as args[0]
            args.unshift(txName);
            // Insert contract as args[0]
            args.unshift(contract);
            // .apply applies the list entries as parameters to the called function
            return utils.submitTx.apply("unused", args)
                .then(buffer => {
                    return buffer;
                }, error => {
                    return Promise.reject(error);
                });
        }, error => {
            return Promise.reject(error);
        });
    }
    catch (error) {
        return Promise.reject(error);
    }
}

supplychainRouter.route('/assets').get(function (request, response) {
    submitTx(request, 'queryAllAssets', '')
        .then((queryAssetResponse) => {
            //  response is already a string;  not a buffer
            let assets = queryAssetResponse;
            console.log ("supplychain.js:  GET assets: ");
            console.log (queryAssetResponse);
            response.status(STATUS_SUCCESS);
            response.send(assets);
        }, (error) => {
            response.status(STATUS_SERVER_ERROR);
            response.send(utils.prepareErrorResponse(error, STATUS_SERVER_ERROR,
                "There was a problem getting the list of assets."));
        });
});  //  process route GET assets/

supplychainRouter.route('/assets/:id').get(function (request, response) {
    submitTx(request, 'queryAsset', request.params.id)
        .then((queryAssetResponse) => {
            // process response
            let asset = Asset.fromBuffer(queryAssetResponse);
            console.log(`asset ${asset.assetId} : price = ${asset.price}, quantity = ${asset.quantity}, producer = ${asset.producerId}, consumer = ${asset.retailerId}, trackingInfo = ${asset.trackingInfo}, state = ${asset.currentAssetState}`);
            response.status(STATUS_SUCCESS);
            response.send(asset);
        }, (error) => {
            response.status(STATUS_SERVER_ERROR);
            response.send(utils.prepareErrorResponse(error, ASSET_NOT_FOUND,
                'Asset id, ' + request.params.id +
                ' does not exist or the user does not have access to asset details at this time.'));
        });
});

/*  POST (list of) assets
 *  When a payload owner requests a space for on a spaceflight, this initiates
 *  the first transaction in the life of a payload.  Corresponding transaction in the smart contract is invoked,
 *  namely, bookMyFlight.  An asset gets created.
 *  Parameters:  request.body:  list of 1 or more payloads with basic details
 *  Authentication:  Basic Auth: username:password
 */

supplychainRouter.route('/assets').post(function (request, response) {
  console.log ('POST assets:  request.body =');  console.log (request.body);
    submitTx(request, 'bookMyFlight', JSON.stringify(request.body))
        .then((result) => {
            // process response
            console.log('\nProcess bookMyFlight transaction.');
            let asset = Asset.fromBuffer(result);
            console.log(`asset ${asset.assetId} : price = ${asset.price}, quantity = ${asset.quantity}, producer = ${asset.producerId}, consumer = ${asset.retailerId}, trackingInfo = ${asset.trackingInfo}, state = ${asset.currentAssetState}`);
            response.status(STATUS_SUCCESS);
            response.send(asset);
        }, (error) => {
            response.status(STATUS_SERVER_ERROR);
            response.send(utils.prepareErrorResponse(error, STATUS_SERVER_ERROR,
                "There was a problem placing the asset."));
        });
});


supplychainRouter.route('/asset-history/:id').get(function (request, response) {
    submitTx(request, 'getAssetHistory', request.params.id)
        .then((txResponse) => {
            console.log('\n>>>Process getAssetHistory response', txResponse);
            //  response is already a string;  not a buffer
            //  no need of conversion from buffer to string
            response.status(STATUS_SUCCESS);
            response.send(txResponse);
        }, (error) => {
            response.status(STATUS_SERVER_ERROR);
            response.send(utils.prepareErrorResponse(error, STATUS_SERVER_ERROR,
                "There was a problem fetching history for asset, ", request.params.id));
        });
});

/*
==============  temp text;  to add functions to match these names @param bookMyFlight
@param assignSlot
@param modifyPayload
@param verifyPayload
* /

//  Payload Owner:  to request a slot in the satellite
supplychainRouter.route('/book-my-flight').post(function (request, response) {
    submitTx(request, 'bookMyFlight', request.body.id)
        .then((txResponse) => {
            // process responses
            console.log('Process bookMyFlight transaction.');
            let asset = Asset.fromBuffer(txResponse);
            //  console.log(`supplychain.js:  Asset ${asset.id} : state = ${asset.currentAssetState}`);
            console.log(`supplychain.js:  Asset ${asset.id} : ` + asset);
            response.status(STATUS_SUCCESS);
            response.send(asset);
        }, (error) => {
            response.status(STATUS_SERVER_ERROR);
            response.send(utils.prepareErrorResponse(error, STATUS_SERVER_ERROR,
                "There was a problem in verifying payload, ", request.params.id));
        });
});  //  process route /
*/
//  Satellite Manufacturer:  accept request and assign a slot in the satellite
supplychainRouter.route('/assign-slot').put(function (request, response) {
    submitTx(request, 'assignSlot', request.body.id)
        .then((txResponse) => {
            // process response
            console.log('Process assignSlot transaction.');
            let asset = Asset.fromBuffer(txResponse);
            console.log(`asset ${asset.id} : state = ${asset.currentAssetState}`);
            response.status(STATUS_SUCCESS);
            response.send(asset);
        }, (error) => {
            response.status(STATUS_SERVER_ERROR);
            response.send(utils.prepareErrorResponse(error, STATUS_SERVER_ERROR,
                "There was a problem in assigning slot to payload, ", request.body.id));
        });
});  //  process route /

//  Satellite Manufacturer:  Verify Payload details;  set state to ASSET_DETAILS_VERIFIED
supplychainRouter.route('/verify-payload/:id').put(function (request, response) {
    submitTx(request, 'verifyPayload', request.params.id)
        .then((txResponse) => {
            // process response
            console.log('Process verifyPayload transaction.');
            let asset = Asset.fromBuffer(txResponse);
            console.log(`asset ${asset.id} : state = ${asset.currentAssetState}`);
            response.status(STATUS_SUCCESS);
            response.send(asset);
        }, (error) => {
            response.status(STATUS_SERVER_ERROR);
            response.send(utils.prepareErrorResponse(error, STATUS_SERVER_ERROR,
                "There was a problem in verifying payload, ", request.params.id));
        });
});  //  process route /

//  Payload owner:  Modify Payload details;  set state to ASSET_DETAILS_MODIFIED
supplychainRouter.route('/ship-payload/:id').put(function (request, response) {
    submitTx(request, 'shipPayload', request.params.id)
        .then((txResponse) => {
            // process response
            console.log('Process shipPayload transaction.');
            let asset = Asset.fromBuffer(txResponse);
            console.log(`asset ${asset.id} : state = ${asset.currentAssetState}`);
            response.status(STATUS_SUCCESS);
            response.send(asset);
        }, (error) => {
            response.status(STATUS_SERVER_ERROR);
            response.send(utils.prepareErrorResponse(error, STATUS_SERVER_ERROR,
                "There was a problem in modifying payload, ", request.params.id));
        });
});  //  process route /

// This changes the status on the asset
supplychainRouter.route('/receive-shipment/:id').put(function (request, response) {
    submitTx(request, 'receivePayload', request.params.id)
        .then((txResponse) => {
            // process response
            console.log('Process receivePayload transaction.');
            let asset = Asset.fromBuffer(txResponse);
            console.log(`asset ${asset.id} : state = ${asset.currentAssetState}`);
            response.status(STATUS_SUCCESS);
            response.send(asset);
        }, (error) => {
            response.status(STATUS_SERVER_ERROR);
            response.send(utils.prepareErrorResponse(error, STATUS_SERVER_ERROR,
                "There was a problem in receiving shipment for asset," + request.params.id));
        });
});  //  process route /

// This changes the status on the asset
supplychainRouter.route('/clear-for-flight/:id').put(function (request, response) {
    submitTx(request, 'clearForFlight', request.params.id)
          .then((txResponse) => {
              // process response
              console.log('Process clearForFlight transaction.');
              let asset = Asset.fromBuffer(txResponse);
              console.log(`asset ${asset.id} : state = ${asset.currentAssetState}`);
              response.status(STATUS_SUCCESS);
              response.send(asset);
          }, (error) => {
              response.status(STATUS_SERVER_ERROR);
              response.send(utils.prepareErrorResponse(error, STATUS_SERVER_ERROR,
                  "There was a problem in clearing payload for flight," + request.params.id));
          });
});  //  process route /

//  Payload owner:  Modify Payload details;  set state to ASSET_DETAILS_MODIFIED
supplychainRouter.route('/modify-payload').post(function (request, response) {
    submitTx(request, 'modifyPayload', JSON.stringify(request.body))
        .then((txResponse) => {
            // process response
            console.log('Process modifyPayload transaction.');
            let asset = Asset.fromBuffer(txResponse);
            console.log(`asset ${asset.id} : state = ${asset.currentAssetState}`);
            response.status(STATUS_SUCCESS);
            response.send(asset);
        }, (error) => {
            response.status(STATUS_SERVER_ERROR);
            response.send(utils.prepareErrorResponse(error, STATUS_SERVER_ERROR,
                "There was a problem in modifying payload, ", request.params.id));
        });
});  //  process route /

// Delete designated asset with id
supplychainRouter.route('/assets/:id').delete(function (request, response) {
  console.log('Delete Asset API');

    submitTx(request, 'deleteAsset', request.params.id)
        .then((deleteAssetResponse) => {
            // process response
            console.log('Process  transaction.');
            console.log('Transaction complete.');
            response.status(STATUS_SUCCESS);
            response.send(deleteAssetResponse);
        }, (error) => {
            response.status(STATUS_SERVER_ERROR);
            response.send(utils.prepareErrorResponse(error, STATUS_SERVER_ERROR,
                "There was a problem in deleting asset, " + request.params.id));
        });
});

////////////////////////////////// User Management APIs ///////////////////////////////////////

//  Purpose:    POST api to register new users with Hyperledger Fabric CA;
//  Note:       After registration, users have to enroll to get certificates
//              to be able to submit transactions to Hyperledger Fabric Peer.
//  Input:      request.body = {username (string), password (string), usertype (string)}
//              usertype = {"admin", "producer", "shipper", "retailer", "customer", "regulator"}
//              An admin identity is required to make this call to CA and
//              should be passed in authorization header.
//  Output:     pwd; If password was "", a generated password is returned in response
//  Usage 1:    "smith", "smithpw", "producer"
//  Usage 2:    "smith", "",        "producer"
supplychainRouter.route('/register-user').post(function (request, response) {
    try {
        let userId = request.body.userid;
        let userPwd = request.body.password;
        let userType = request.body.usertype;

        //  only admin can call this api;  get admin username and pwd from request header
        getUsernamePassword(request)
            .then(request => {
                //  1.  No need to call setUserContext
                //  Fabric CA client is used for register-user;
                //  2.  In this demo application UI, only admin sees the page "Manage Users"
                //  So, it is assumed that only the admin has access to this api
                //  register-user can only be called by a user with admin privileges.

                utils.registerUser(userId, userPwd, userType, request.username).
                    then((result) => {
                        response.status(STATUS_SUCCESS);
                        response.send(result);
                    }, (error) => {
                        response.status(STATUS_CLIENT_ERROR);
                        response.send(utils.prepareErrorResponse(error, STATUS_CLIENT_ERROR,
                            "User, " + userId + " could not be registered. "
                            + "Verify if calling identity has admin privileges."));
                    });
            }, error => {
                response.status(STATUS_CLIENT_ERROR);
                response.send(utils.prepareErrorResponse(error, INVALID_HEADER,
                    "Invalid header;  User, " + userId + " could not be registered."));
            });
    } catch (error) {
        response.status(STATUS_SERVER_ERROR);
        response.send(utils.prepareErrorResponse(error, STATUS_SERVER_ERROR,
            "Internal server error; User, " + userId + " could not be registered."));
    }
});  //  process route register-user

//  Purpose:    To enroll registered users with Fabric CA;
//  A call to enrollUser to Fabric CA generates (and returns) certificates for the given (registered) user;
//  These certificates are need for subsequent calls to Fabric Peers.
//  Input: { userid, password } in header and request.body.usertype
//  Output:  Certificate on successful enrollment
//  Usage:  "smith", "smithpw", "producer"
supplychainRouter.route('/enroll-user/').post(function (request, response) {
    let userType = request.body.usertype;
    //  retrieve username, password of the called from authorization header
    getUsernamePassword(request).then(request => {
        utils.enrollUser(request.username, request.password, userType).then(result => {
            response.status(STATUS_SUCCESS);
            response.send(result);
        }, error => {
            response.status(STATUS_CLIENT_ERROR);
            response.send(utils.prepareErrorResponse(error, STATUS_CLIENT_ERROR,
                "User, " + request.username + " could not be enrolled. Check that user is registered."));
        });
    }), (error => {
        response.status(STATUS_CLIENT_ERROR);
        response.send(utils.prepareErrorResponse(error, INVALID_HEADER,
            "Invalid header;  User, " + request.username + " could not be enrolled."));
    });
});  //  post('/api/enroll-user/', (request, response) )

//  Purpose:    To check if user is enrolled with Fabric CA;
//  Input:  request.params.id = { userid }
//  Iutput:  Certificate on successful enrollment
//  Usage:  ""
/*
app.get('/api/is-user-enrolled/:id', (request, response) => {
*/
supplychainRouter.route('/is-user-enrolled/:id').get(function (request, response) {
    //  only admin can call this api;  But this is not verified here
    //  get admin username and pwd from request header
    //
    getUsernamePassword(request)
        .then(request => {
            let userId = request.params.id;
            utils.isUserEnrolled(userId).then(result => {
                response.status(STATUS_SUCCESS);
                response.send(result);
            }, error => {
                response.status(STATUS_CLIENT_ERROR);
                response.send(utils.prepareErrorResponse(error, STATUS_CLIENT_ERROR,
                  "Error checking enrollment for user, " + request.params.id));
            });
        }, ((error) => {
            response.status(STATUS_CLIENT_ERROR);
            response.send(utils.prepareErrorResponse(error, INVALID_HEADER,
                "Invalid header; Error checking enrollment for user, " + request.params.id));
        }));
})  //  end of is-user-enrolled

//  Purpose: Get list of all users
//  Output:  array of all registered users
//  Usage:  ""
supplychainRouter.route('/users').get(function (request, response) {
    getUsernamePassword(request)
        .then(request => {
            utils.getAllUsers(request.username).then((result) => {
                response.status(STATUS_SUCCESS);
                response.send(result);
            }, (error) => {
                response.status(STATUS_SERVER_ERROR);
                response.send(utils.prepareErrorResponse (error, STATUS_SERVER_ERROR,
                    "Problem getting list of users."));
            });
        }, ((error) => {
            response.status(STATUS_CLIENT_ERROR);
            response.send(utils.prepareErrorResponse(error, INVALID_HEADER,
                "Invalid header;  User, " + request.username + " could not be enrolled."));
        }));
});

supplychainRouter.route('/users/:id').get(function (request, response) {
    //  Get admin username and pwd from request header
    //  Only admin can call this api; this is not verified here;
    //  Possible future enhancement
    getUsernamePassword(request)
        .then(request => {
            utils.isUserEnrolled(request.params.id).then(result1 => {
                if (result1 == true) {
                    utils.getUser(request.params.id, request.username).then((result2) => {
                        response.status(STATUS_SUCCESS);
                        response.send(result2);
                    }, (error) => {
                        response.status(STATUS_SERVER_ERROR);
                        response.send(utils.prepareErrorResponse(error, STATUS_SERVER_ERROR,
                            "Could not get user details for user, " + request.params.id));
                    });
                } else {
                    let error = {};
                    response.status(STATUS_CLIENT_ERROR);
                    response.send(utils.prepareErrorResponse(error, USER_NOT_ENROLLED,
                        "Verify if the user is registered and enrolled."));
                }
            }, error => {
                response.status(STATUS_SERVER_ERROR);
                response.send(utils.prepareErrorResponse(error, STATUS_SERVER_ERROR,
                    "Problem checking for user enrollment."));
            });
        }, ((error) => {
            response.status(STATUS_CLIENT_ERROR);
            response.send(utils.prepareErrorResponse(error, INVALID_HEADER,
                "Invalid header;  User, " + request.params.id + " could not be enrolled."));
        }));
});

module.exports = supplychainRouter;
