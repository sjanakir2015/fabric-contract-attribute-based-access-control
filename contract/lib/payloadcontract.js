/*
SPDX-License-Identifier: Apache-2.0
*/

'use strict';

// Fabric smart contract classes
const { Contract, Context } = require('fabric-contract-api');

// supplychainnet specifc classes
const Asset = require('./asset.js');
const AssetState = require('./asset.js').assetState;

//  Participants types (values for attribute, usertype)
const PAYLOAD_OWNER = "payloadowner";
const LAUNCHER = "launcher";

//  EVENT
const EVENT_TYPE = "hlfabricevent";  //   Hyperledger Fabric Event

//  Error codes
const DUPLICATE_ASSET_ID = 101;
const ASSET_ID_NOT_FOUND = 102;

/**
 * A custom context provides easy access to list of all products
 */
class SupplychainContext extends Context {
    constructor() {
        super();
    }
}

/**
 * Define product smart contract by extending Fabric Contract class
 */
class SupplychainContract extends Contract {

    constructor() {
        // Unique namespace when multiple contracts per chaincode file
        super('org.supplychainnet.contract');
    }

    /**
     * Define a custom context for product
    */
    createContext() {
        return new SupplychainContext();
    }

    /**
     * Instantiate to perform any setup of the ledger that might be required.
     * @param {Context} ctx the transaction context
     */
    async init(ctx) {
        // No implementation required with this example
        // It could be where data migration is performed, if necessary
        console.log('Instantiate the contract');
    }

    /**
     * bookMyFlight
     * To be called by a Payload Owner when a request is placed for a slot in launcher
     *
     * @param {Context} ctx the transaction context
     * @param {String}  id asset id
    */
    async bookMyFlight (ctx, args) {
        // Access Control: This transaction should only be invoked by a PayloadOwner
        let userType = await this.getCurrentUserType(ctx);

        if ((userType != "admin") && // admin only has access as a precaution.
            (userType != PAYLOAD_OWNER) )
            throw new Error(`This user does not have access to request for payload booking.`);

        //  process payload details
        const payload_details = JSON.parse(args);
        const payloadId = payload_details.id;

        console.log("incoming asset fields: " + JSON.stringify(payload_details));

        // Check if an payload already exists with id=payloadId
        var payloadAsBytes = await ctx.stub.getState(payloadId);
        if (payloadAsBytes && payloadAsBytes.length > 0) {
            throw new Error(`Error Message from bookMyFlight txn. Payload with payloadId = ${payloadId} already exists.`);
        }

        // Create a new Payload object
        let payload = Asset.createInstance(payloadId);
        payload.id = payload_details.id;
        payload.owner = payload_details.owner.toString();
        payload.frequencyBand = payload_details.frequencyBand.toString();
        payload.cubesatSize = payload_details.cubesatSize.toString();
        payload.mass = payload_details.mass.toString();
        payload.launcher = '---';
        payload.modifiedBy = await this.getCurrentUserId(ctx);
        payload.currentAssetState = AssetState.ASSET_CREATED;

        // Update ledger
        await ctx.stub.putState(payloadId, payload.toBuffer());

        // Define and set event
        const event_obj = payload;
        event_obj.event_type = "createPayload";   //  add the field "event_type" for the event to be processed

        try {
            await ctx.stub.setEvent(EVENT_TYPE, event_obj.toBuffer());
        }
        catch (error) {
            console.log("Error in sending event");
        }
        finally {
            console.log("Attempted to send event = ", payload);
        }

        // Must return a serialized payload to caller of smart contract
        return payload.toBuffer();
    }

    /**
      * verifyPayload
      * To be called by a Satellite launcher when a request is placed by a payload owner
      * for a slot in the satellite
      *
      * @param {Context} ctx the transaction context
      * @param {String}  id asset id
      * Usage:  verifyPayload ('payload1')
     */
    async verifyPayload(ctx, id) {
        console.info('============= verifyPayload ===========');

        if (id.length < 1) {
            throw new Error('asset id is required as input')
        }

        // Retrieve the current asset using key provided
        var assetAsBytes = await ctx.stub.getState(id);
        if (!assetAsBytes || assetAsBytes.length === 0) {
            throw new Error(`Error Message from verifyPayload: Asset with assetId = ${id} does not exist.`);
        }

        // Access Control: This transaction should only be invoked by a LAUNCHER
        let userType = await this.getCurrentUserType(ctx);

        if ((userType != "admin") && // admin only has access as a precaution.
            (userType != LAUNCHER) )
            throw new Error(`This user does not have access to this transaction.`);

        // Convert asset so we can modify fields
        var asset = Asset.deserialize(assetAsBytes);

        // Tx processing; assign launcher and Change State
        asset.launcher = await this.getCurrentUserId(ctx);
        asset.currentAssetState = AssetState.ASSET_DETAILS_VERIFIED;

        // Track who is invoking this transaction
        asset.modifiedBy = await this.getCurrentUserId(ctx);

        // Update ledger
        await ctx.stub.putState(id, asset.toBuffer());

        // Must return a serialized asset to caller of smart contract
        return asset.toBuffer();
    }

    /**
      * shipPayload
      * To be called by a PayloadOwner when payload gets shipped to LAUNCHER
      *
      * @param {Context} ctx the transaction context
      * @param {String}  id  asset id which is shipped
      * Usage:  shipPayload ('payload1')
     */
    async shipPayload(ctx, id) {
        console.info('============= shipPayload ===========');

        if (id.length < 1) {
            throw new Error('asset id is required as input')
        }

        // Retrieve the current asset using key provided
        var assetAsBytes = await ctx.stub.getState(id);
        if (!assetAsBytes || assetAsBytes.length === 0) {
            throw new Error(`Error Message from verifyPayload: Asset with assetId = ${id} does not exist.`);
        }

        // Access Control: This transaction should only be invoked by a PayloadOwner
        let userType = await this.getCurrentUserType(ctx);

        if ((userType != "admin") && // admin only has access as a precaution.
            (userType != PAYLOAD_OWNER  ) )
            throw new Error(`This user does not have access to this transaction.`);

        // Convert asset so we can modify fields
        var asset = Asset.deserialize(assetAsBytes);

        // Tx processing; Change State
        asset.currentAssetState = AssetState.ASSET_IN_TRANSIT;

        // Track who is invoking this transaction
        asset.modifiedBy = await this.getCurrentUserId(ctx);

        // Update ledger
        await ctx.stub.putState(id, asset.toBuffer());

        // Must return a serialized asset to caller of smart contract
        return asset.toBuffer();
    }


    /**
      * receivePayload
      * To be called by a Satellitelauncher when payload is received
      *
      * @param {Context} ctx the transaction context
      * @param {String}  id  asset id which is shipped
      * Usage:  receivePayload ('payload1')
     */
    async receivePayload(ctx, id) {
        console.info('============= receivePayload ===========');

        if (id.length < 1) {
            throw new Error('asset id is required as input')
        }

        // Retrieve the current asset using key provided
        var assetAsBytes = await ctx.stub.getState(id);
        if (!assetAsBytes || assetAsBytes.length === 0) {
            throw new Error(`Error Message from verifyPayload: Asset with assetId = ${id} does not exist.`);
        }

        // Access Control: This transaction should only be invoked by a PayloadOwner
        let userType = await this.getCurrentUserType(ctx);

        if ((userType != "admin") && // admin has access for dev purposes
            (userType != LAUNCHER  ) )
            throw new Error(`This user does not have access to this transaction.`);

        // Convert asset so we can modify fields
        var asset = Asset.deserialize(assetAsBytes);

        // Tx processing; Change State
        asset.currentAssetState = AssetState.ASSET_RECEIVED;

        // Track who is invoking this transaction
        asset.modifiedBy = await this.getCurrentUserId(ctx);

        // Update ledger
        await ctx.stub.putState(id, asset.toBuffer());

        // Must return a serialized asset to caller of smart contract
        return asset.toBuffer();
    }


    /**
      * clearForFlight
      * To be called by a Satellitelauncher when payload is clearForFlight
      *
      * @param {Context} ctx the transaction context
      * @param {String}  id  asset id which is shipped
      * Usage:  clearForFlight ('payload1')
     */
    async clearForFlight(ctx, id) {
        console.info('============= clearForFlight ===========');

        if (id.length < 1) {
            throw new Error('asset id is required as input')
        }

        // Retrieve the current asset using key provided
        var assetAsBytes = await ctx.stub.getState(id);
        if (!assetAsBytes || assetAsBytes.length === 0) {
            throw new Error(`Error Message from clearForFlight: Asset with assetId = ${id} does not exist.`);
        }

        // Access Control: This transaction should only be invoked by a PayloadOwner
        let userType = await this.getCurrentUserType(ctx);

        if ((userType != "admin") && // admin has access for dev purposes
            (userType != LAUNCHER  ) )
            throw new Error(`This user does not have access to this transaction.`);

        // Convert asset so we can modify fields
        var asset = Asset.deserialize(assetAsBytes);

        // Tx processing; Change State
        asset.currentAssetState = AssetState.ASSET_CLEAR_FOR_FLIGHT;

        // Track who is invoking this transaction
        asset.modifiedBy = await this.getCurrentUserId(ctx);

        // Update ledger
        await ctx.stub.putState(id, asset.toBuffer());

        // Must return a serialized asset to caller of smart contract
        return asset.toBuffer();
    }

    /**
     * queryAsset
     *
     * @param {Context} ctx the transaction context
     * @param {String}  assetId
     * Usage:  queryAsset ('Asset001')
     *
    */
    async queryAsset(ctx, assetId) {
        console.info('============= queryAsset ===========');

        if (assetId.length < 1) {
            throw new Error('assetId is required as input')
        }

        var assetAsBytes = await ctx.stub.getState(assetId);
        if (!assetAsBytes || assetAsBytes.length === 0) {
            throw new Error(`Error Message from queryAsset: Asset with assetId = ${assetId} does not exist.`);
        }

        //  Set an event (irrespective of whether the asset existed or not)
        // define and set EVENT_TYPE
        let queryEvent = {
            type: EVENT_TYPE,
            assetId: assetId,
            desc: "Query Asset was executed for " + assetId
        };
        await ctx.stub.setEvent(EVENT_TYPE, Buffer.from(JSON.stringify(queryEvent)));

        if (!assetAsBytes || assetAsBytes.length === 0) {
            throw new Error(`Error Message from queryAsset: Asset with assetId = ${assetId} does not exist.`);
        }

        // Access Control:
        var asset = Asset.deserialize(assetAsBytes);
        let userId = await this.getCurrentUserId(ctx);

        if ((userId != "admin") // admin only has access as a precaution.
            && (userId != asset.owner))
            throw new Error(`${userId} does not have access to the details of asset ${assetId}`);

        // Return a serialized asset to caller of smart contract
        return assetAsBytes;
    }

    /**
     * queryAllAssets
     *   New version of queryAllAssets where ACLs are applied
     *  "regulator": return all assets
     * @param {Context} ctx the transaction context
     * @param {String}  args
     * Usage:  queryAllAssets ()
    */
    async queryAllAssets(ctx) {
        console.info('============= queryAllAssets ===========');

        let userId = await this.getCurrentUserId(ctx);
        let userType = await this.getCurrentUserType(ctx);    //  ABAC used here

        //  For adding filters in query, usage: {"selector":{"fieldName":"value"}}
        let queryString;

        // Access control done on userType
        // Further filtering done on field name
        switch (userType) {
            case "admin":
            case "customer":
            case "regulator": {
                queryString = {
                    "selector": {}  //  no filter;  return all assets
                }
                break;
            }

            case "payloadowner":  {
                queryString = {
                    "selector": {
                        "owner": userId   //  each payload can be viewed by only its owner
                    }
                }
                break;
            }

            case LAUNCHER:   {
                //  if there are multiple launchers, this will filter out payloads
                //   handled by other launchers.
                queryString = {
                    "selector": {
                        "launcher": { $in: ["---" , userId] }
                    }
                }
                break;
            }

            default: {
                return [];
            }
        }

        console.log("In queryAllAssets: queryString = ");
        console.log(queryString);
        // Get all assets that meet queryString criteria
        const iterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        const allAssets = [];

        // Iterate through them and build an array of JSON objects
        while (true) {
            const asset = await iterator.next();
            if (asset.value && asset.value.value.toString()) {
                console.log(asset.value.value.toString('utf8'));

                let Record;

                try {
                    Record = JSON.parse(asset.value.value.toString('utf8'));
                } catch (err) {
                    console.log(err);
                    Record = asset.value.value.toString('utf8');
                }

                // Add to array of assets
                allAssets.push(Record);
            }

            if (asset.done) {
                console.log('end of data');
                await iterator.close();
                console.info(allAssets);
                return allAssets;
            }
        }
    }

    /**
     * getAssetHistory
     *
     * @param {Context} ctx the transaction context
     * @param {String}  args
     * Usage:  getAssetHistory ('Asset001')
     */

    async getAssetHistory(ctx, assetId) {
        console.info('============= getAssetHistory ===========');
        if (assetId.length < 1) {
            throw new Error('assetId is required as input')
        }
        console.log("input, assetId = " + assetId);

        // Retrieve the current asset using key provided
        var assetAsBytes = await ctx.stub.getState(assetId);

        if (!assetAsBytes || assetAsBytes.length === 0) {
            throw new Error(`Error Message from getAssetHistory: Asset with assetId = ${assetId} does not exist.`);
        }

        // Access Control: Only those associated with this asset
        // Retrieve the current asset using key provided
        var asset = Asset.deserialize(assetAsBytes);
        let userId = await this.getCurrentUserId(ctx);
        let userType = await this.getCurrentUserType(ctx);

        // Access Control:
        if ((userId != "admin")             // admin only has access as a precaution.
            && (userType != "customer")      // Customers can see any asset if it's in the correct state
            && (userType != "regulator") )    // Regulators can see any asset
            throw new Error(`${userId} does not have access to asset ${assetId}`);

        // Get list of transactions for asset
        const iterator = await ctx.stub.getHistoryForKey(assetId);
        const assetHistory = [];

        while (true) {
            let history = await iterator.next();

            if (history.value && history.value.value.toString()) {
                let jsonRes = {};
                jsonRes.TxId = history.value.tx_id;
                jsonRes.IsDelete = history.value.is_delete.toString();
                // Convert Timestamp date
                var d = new Date(0);
                d.setUTCSeconds(history.value.timestamp.seconds.low);
                jsonRes.Timestamp = d.toLocaleString("en-US", { timeZone: "Asia/Calcutta" }) + " IST";
                // Store Asset details
                try {
                    jsonRes.Value = JSON.parse(history.value.value.toString('utf8'));
                } catch (err) {
                    console.log(err);
                    jsonRes.Value = history.value.value.toString('utf8');
                }

                // Add to array of transaction history on asset
                assetHistory.push(jsonRes);
            }

            if (history.done) {
                console.log('end of data');
                await iterator.close();
                console.info(assetHistory);
                return assetHistory;
            }
        } //  while (true)
    }

    /**
     * deleteAsset
     *
     * @param {Context} ctx the transaction context
     * @param {String}  args
     * Usage:  deleteAsset ('Asset001')
     */

    async deleteAsset(ctx, id) {
        console.info('============= deleteAsset ===========');
        if (id.length < 1) {
            throw new Error('Id required as input')
        }
        console.log("Id = " + id);

        // Retrieve the current asset using key provided
        var assetAsBytes = await ctx.stub.getState(id);

        if (!assetAsBytes || assetAsBytes.length === 0) {
            throw new Error(`Error Message from deleteAsset: Asset with id = ${id} does not exist.`);
        }

        // Access Control: This transaction should only be invoked by designated PayloadOwner
        var asset = Asset.deserialize(assetAsBytes);
        let userId = await this.getCurrentUserId(ctx);

        if ((userId != "admin") // admin only has access as a precaution.
            && (userId != asset.owner)) // This transaction should only be invoked by the owner of asset
            throw new Error(`${userId} does not have access to delete asset ${id}`);
        await ctx.stub.deleteState(id); //remove the asset from chaincode state
    }

    /**
      * getCurrentUserId
      * To be called by application to get the type for a user who is logged in
      *
      * @param {Context} ctx the transaction context
      * Usage:  getCurrentUserId ()
     */
    async getCurrentUserId(ctx) {

        let id = [];
        id.push(ctx.clientIdentity.getID());
        var begin = id[0].indexOf("/CN=");
        var end = id[0].lastIndexOf("::/C=");
        let userid = id[0].substring(begin + 4, end);
        return userid;
    }

    /**
      * getCurrentUserType
      * To be called by application to get the type for a user who is logged in
      * ABAC used here;  User attribute added at Registration time (usertype) is being retrieved
      * from the user certificate in the Smart Contract;   Attribute is then used
      * to make decisions for access control.
      *
      * @param {Context} ctx the transaction context
      * Usage:  getCurrentUserType ()
     */
    async getCurrentUserType(ctx) {

        let userid = await this.getCurrentUserId(ctx);

        //  check user id;  if admin, return type = admin;
        //  else return value set for attribute "type" in certificate;
        if (userid == "admin") {
            return userid;
        }
        return ctx.clientIdentity.getAttributeValue("usertype");
    }

    /**
      * modifyPayload
      * To be called by a PayloadOwner when payload details are to be modified
      * *****************  not currently used;  not tested  ******************
     */
    async modifyPayload(ctx, args) {
        console.info('============= modifyPayload ===========');

        // Access Control: This transaction should only be invoked by a PayloadOwner
        let userType = await this.getCurrentUserType(ctx);

        if ((userType != "admin") && // admin only has access as a precaution.
            (userType != PAYLOAD_OWNER) )
            throw new Error(`This user does not have access to modify payload.`);

        //  process payload details
        const payload_details = JSON.parse(args);
        const id = payload_details.id;

        console.log("incoming asset fields: " + JSON.stringify(payload_details));

        // Retrieve the current asset using key provided
        var assetAsBytes = await ctx.stub.getState(id);
        if (!assetAsBytes || assetAsBytes.length === 0) {
            throw new Error(`Error Message from modifyPayload: Asset with assetId = ${id} does not exist.`);
        }

        // Convert asset so we can modify fields
        var payload = Asset.deserialize(assetAsBytes);

        // Tx processing; Change State
        payload.frequencyBand = payload_details.frequencyBand.toString();
        payload.cubesatSize = payload_details.cubesatSize.toString();
        payload.mass = payload_details.mass.toString();
        payload.currentAssetState = AssetState.ASSET_DETAILS_MODIFIED;

        // Track who is invoking this transaction
        payload.modifiedBy = await this.getCurrentUserId(ctx);

        // Update ledger
        await ctx.stub.putState(id, payload.toBuffer());

        // Must return a serialized asset to caller of smart contract
        return payload.toBuffer();
    }

    /******************  not used  **********************/
}  //  Class SupplychainContract

module.exports = SupplychainContract;
