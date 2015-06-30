'use strict';

import Wreck from 'wreck';

export default function fetch(url) {
    return new Promise((resolve, reject) => {
        Wreck.get(url, (error, response, body) => {
            if (error) {
                reject(error);
                return;
            }
            try {
                body = JSON.parse(body);
                resolve(body);
            }
            catch (error) {
                reject(error);
            }
        });
    });
};
