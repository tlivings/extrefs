'use strict';

import Http from 'http';

export default function fetch(url) {
    return new Promise((resolve, reject) => {
        Http.get(url, (response) => {
            var chunks = [];

            var onReadable = () => {
                var chunk;
                while ((chunk = response.read()) !== null) {
                    chunks.push(chunk);
                }
            };

            var onEnd = () => {
                response.removeListener('readable', onReadable);
                response.removeListener('error', onError);
                resolve(JSON.parse(Buffer.concat(chunks)));
            };

            var onError = (error) => {
                response.removeListener('readable', onReadable);
                response.removeListener('end', onEnd);
                reject(error);
            };

            response.on('readable', onReadable);
            response.once('error', onError);
            response.once('end', onEnd);
        });
    });
};
