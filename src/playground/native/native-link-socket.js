import {drmer} from '@pipijr/core';

/**
 * This class provides a NativeLinkSocket implementation
 */
class NativeLinkSocket {
    constructor (type) {
        this._type = type;
        this._onOpen = null;
        this._onClose = null;
        this._onError = null;
        this._handleMessage = null;

        this._liveId = null;
    }

    open () {

        if (
            !(this._onOpen && this._onClose && this._onError && this._handleMessage)
        ) {
            throw new Error(
                'Must set open, close, message and error handlers before calling open on the socket'
            );
        }

        this._liveId = drmer.live('LinkService@open', payload => {
            const data = JSON.parse(payload);

            this._onMessage(data);
        });

        this._onOpen();
    }

    close () {
        drmer.die(this._liveId);
        this._liveId = null;
        drmer.run('LinkService@close');
    }

    sendMessage (message) {
        drmer.run('LinkService@send', message);
    }

    setOnOpen (fn) {
        this._onOpen = fn;
    }

    setOnClose (fn) {
        this._onClose = fn;
    }

    setOnError (fn) {
        this._onError = fn;
    }

    setHandleMessage (fn) {
        this._handleMessage = fn;
    }

    isOpen () {
        return !!this._liveId;
    }

    _onMessage (message) {
        this._handleMessage(message);
    }
}

export default NativeLinkSocket;
