/*
SPDX-License-Identifier: Apache-2.0
*/

'use strict';

// Utility class for ledger state
const State = require('../ledger-api/state.js');

// Enumerate asset state values
const assetState = {
    ASSET_CREATED: 1,               // PAYLOAD_OWNER
    ASSET_DETAILS_VERIFIED: 2,      // SATELLITE_MANUFACTURER
    ASSET_DETAILS_MODIFIED: 3,      // PAYLOAD_OWNER;  Not used currently   
    ASSET_IN_TRANSIT: 4,            // PAYLOAD_OWNER
    ASSET_RECEIVED: 5,              // SATELLITE_MANUFACTURER
    ASSET_CLEAR_FOR_FLIGHT: 6,      // SATELLITE_MANUFACTURER
    ASSET_CLOSED: 7                 // Not currently used
};

/**
 * Asset class extends State class
 * Class will be used by application and smart contract to define a Asset
 */
class Asset extends State {

    constructor(obj) {
        super(Asset.getClass(), [obj.assetId]);
        Object.assign(this, obj);
    }

    /*
    Definition:  Class Asset:
      {String}  id
      ...
      {Enumerated assetStates} currentAssetState
      {String} modifiedBy
    */

    /**
     * Basic getters and setters
    */
    getId() {
        return this.assetId;
    }
/*  //  should never be called explicitly;
    //  id is set at the time of constructor call.
    setId(newId) {
        this.id = newId;
    }
*/
    /**
     * Useful methods to encapsulate  Asset states
     */
    setState(newState) {
        this.currentAssetState = newState;
    }

    static fromBuffer(buffer) {
        return Asset.deserialize(Buffer.from(JSON.parse(buffer)));
    }

    toBuffer() {
        return Buffer.from(JSON.stringify(this));
    }

    /**
     * Deserialize a state data to  Asset
     * @param {Buffer} data to form back into the object
     */
    static deserialize(data) {
        return State.deserializeClass(data, Asset);
    }

    /**
     * Factory method to create an asset object
     */
    static createInstance(assetId) {
        return new Asset({assetId});
    }

    static getClass() {
        return 'org.supplychainnet.asset';
    }
}

module.exports = Asset;
module.exports.assetState = assetState;
