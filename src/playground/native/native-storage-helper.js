import {drmer} from '@pipijr/core';
import base64js from 'base64-js';

/**
 * Allow the storage module to load files bundled in the native application.
 */
class NativeStorageHelper {
    constructor (storageInstance) {
        this.parent = storageInstance;
    }

    /**
     * Fetch an asset but don't process dependencies.
     * @param {AssetType} assetType - The type of asset to fetch.
     * @param {string} assetId - The ID of the asset to fetch: a project ID, MD5, etc.
     * @param {DataFormat} dataFormat - The file format / file extension of the asset to fetch: PNG, JPG, etc.
     * @return {Promise.<Asset>} A promise for the contents of the asset.
     */
    load (assetType, assetId, dataFormat) {
        return new Promise((resolve, reject) => {
            (async () => {
                const res = await drmer.call('AssetService@load', {
                    assetType,
                    assetId,
                    dataFormat
                });

                if (!res || res === 'null') {
                    reject(new Error('no asset found'));

                    return;
                }
                const asset = new this.parent.Asset(assetType, assetId, dataFormat);
                asset.setData(base64js.toByteArray(res), dataFormat);

                resolve(asset);
            })();
        });
    }
}

export default NativeStorageHelper;
