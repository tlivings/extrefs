'use strict';

import Http from 'http';

export default function fetch(url, callback) {
    Http.get(url, function (response) {
        var chunks = [];

        var onReadable = () => {
            var chunk;
            while ((chunk = response.read()) !== null) {
                chunks.push(chunk);
            }
        };

        var onEnd = () => {
            try {
                let body = JSON.parse(Buffer.concat(chunks));
                callback(null, body);
            }
            catch (error) {
                callback(error);
                return;
            }
            finally {
                response.removeListener('readable', onReadable);
                response.removeListener('error', onError);
            }
        };

        var onError = (error) => {
            response.removeListener('readable', onReadable);
            response.removeListener('end', onEnd);
            callback(error);
        };

        response.on('readable', onReadable);
        response.once('error', callback);
        response.once('end', onEnd);
    });
};
