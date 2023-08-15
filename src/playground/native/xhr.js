// Function to intercept XMLHttpRequest
import {drmer} from '@pipijr/core';
import xhook from 'xhook';
import base64js from 'base64-js';

xhook.before((request, callback) => {
    let url;
    try {
        url = new URL(request.url);
    } catch (err) {
        return callback();
    }

    const {method, body} = request;

    const params = new Map(url.searchParams.entries());

    if (url.protocol !== 'native:') {
        return callback();
    }

    const index = url.pathname.indexOf('/');
    const service = url.pathname.substring(0, index);
    const path = url.pathname.substring(index + 1);
    const needsRaw = path.endsWith('zip');

    (async () => {
        const res = await drmer.call(`${service}@${method.toLowerCase()}`, {
            path: path,
            params: params,
            payload: body
        });

        callback({
            status: 200,
            data: needsRaw ? base64js.toByteArray(res) : res
        });
    })();
});

xhook.after((_, resp, callback) => {
    // On WKWebView of iOS, the status maybe 0
    if (resp.status === 0) {
        callback(new Response(resp.body));
    } else {
        callback(resp);
    }
});

xhook.enable();
