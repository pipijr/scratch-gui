import {drmer} from '@pipijr/core';
const oldOpen = window.open;

window.open = (url, target) => {
    if (drmer.bridge) {
        window.location = url;
    } else {
        oldOpen(url, target);
    }
};
