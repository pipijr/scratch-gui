import 'get-float-time-domain-data';
import {drmer} from '@pipijr/core';
import SharedAudioContext from './shared-audio-context.js';
import {computeChunkedRMS} from './audio-util.js';
import base64js from 'base64-js';

const BUFFER_LENGTH = 8192;

class NativeAudioRecorder {
    constructor () {
        this.audioContext = new SharedAudioContext();
        this._onUpdate = null;
        this._onError = null;
        this._liveId = null;
        this.handleUpdate = this.handleUpdate.bind(this);
    }

    startListening (onStarted, onUpdate, onError) {
        this._onUpdate = onUpdate;
        this._onError = onError;
        (async () => {
            const permission = await drmer.call('RecordService@requestPermission');
            if (permission < 1) {
                this.handleError(new Error('no permission'));

                return;
            }
            if (!this.disposed) {
                this._liveId = drmer.live('RecordService@listen', this.handleUpdate);
                this.started = true;
                onStarted();
            }
        })();

    }

    handleUpdate (payload) {
        if (this.disposed || !payload) {
            return;
        }
        if (this._onUpdate) {
            this._onUpdate(Math.sqrt(payload / 0.55));
        }
    }

    handleError (err) {
        if (this.disposed) {
            return;
        }
        // eslint-disable-next-line no-unused-expressions
        this._onError && this._onError(err);
    }

    startRecording () {
        this.recording = true;
        drmer.run('RecordService@start');
    }

    stop () {
        return new Promise((resolve, reject) => {
            drmer.run('RecordService@stop');
            drmer.call('RecordService@data').then(data => {
                if (!data) {
                    reject(new Error('no data'));
                }
                const byteArray = base64js.toByteArray(data);
                this.audioContext.decodeAudioData(byteArray.buffer, audioBuffer => {
                    const channelData = audioBuffer.getChannelData(0);
                    const length = Math.ceil(channelData.length / BUFFER_LENGTH) * BUFFER_LENGTH;
                    const buffer = new Float32Array(length);
                    buffer.set(channelData);

                    const chunkLevels = computeChunkedRMS(buffer);
                    const maxRMS = Math.max.apply(null, chunkLevels);
                    const threshold = maxRMS / 8;

                    let firstChunkAboveThreshold = null;
                    let lastChunkAboveThreshold = null;
                    for (let i = 0; i < chunkLevels.length; i++) {
                        if (chunkLevels[i] > threshold) {
                            if (firstChunkAboveThreshold === null) firstChunkAboveThreshold = i + 1;
                            lastChunkAboveThreshold = i + 1;
                        }
                    }

                    const bufferLength = buffer.length / BUFFER_LENGTH;

                    let trimStart = Math.max(2, firstChunkAboveThreshold - 2) / bufferLength;
                    let trimEnd = Math.min(bufferLength - 2, lastChunkAboveThreshold + 2) / bufferLength;

                    // With very few samples, the automatic trimming can produce invalid values
                    if (trimStart >= trimEnd) {
                        trimStart = 0;
                        trimEnd = 1;
                    }

                    if (this.audioContext.state === 'interrupted') {
                        this.audioContext.resume();
                    }

                    resolve({
                        levels: chunkLevels,
                        samples: buffer,
                        sampleRate: audioBuffer.sampleRate,
                        trimStart: trimStart,
                        trimEnd: trimEnd
                    });
                }, err => {
                    reject(err);
                });
            });
        });
    }

    dispose () {
        this.disposed = true;
        drmer.run('RecordService@dispose');
    }
}

export default NativeAudioRecorder;
