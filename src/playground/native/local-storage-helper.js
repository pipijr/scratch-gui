/**
 * Allow the storage module to load files bundled in the native application.
 */
class LocalStorageHelper {
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
            fetch(`assets/${assetId}.${dataFormat}`)
                .then(response => {
                    if (response.ok) {
                        response.arrayBuffer().then(data => {
                            resolve(new this.parent.Asset(assetType, assetId, dataFormat, new Uint8Array(data)));
                        });
                    } else {
                        reject(new Error('resource not available'));
                    }
                })
                .catch(error => {
                    reject(error);
                });
        });
    }
}

export default LocalStorageHelper;
