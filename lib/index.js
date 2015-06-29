'use strict';

import Util from 'util';
import Path from 'path';
import Url from 'url';
import Caller from 'caller';
import Fetch from './fetch';

export default function extrefs(schema = {}, {basedir = Path.dirname(Caller())} = {}) {
    var urlcontext = basedir.substr(0, 5) === 'http:';

    function resolveRef(value) {
        var url = Url.parse(value);
        var id = url.pathname;

        return new Promise((resolve, reject) => {
            //Local reference
            if (!id) {
                resolve();
                return;
            }

            if (id[0] === '/') {
                id = id.substr(1);
            }

            if (urlcontext) {
                url = url.parse(basedir);
            }

            if (url.protocol === 'http:') {
                var baseurl;
                var destination = value;

                if (urlcontext) {
                    baseurl = basedir;
                    destination = baseurl + '/' + value;
                }
                else {
                    let refurl = Url.parse(value);

                    baseurl = Url.format({
                        protocol: url.protocol,
                        host: url.host
                    });
                }

                Fetch(destination).then((body) => {
                    extrefs(body, {basedir: baseurl}).resolve((error, subschemas) => {
                        if (error) {
                            reject(error);
                            return;
                        }

                        resolve({
                            id: baseurl + '/' + id,
                            inremote: true,
                            value: body,
                            subschemas: subschemas
                        });
                    });
                }).catch(reject);

                return;
            }

            var obj = require(Path.resolve(basedir, id));

            extrefs(obj, {basedir: basedir}).resolve((error, subschemas) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve({
                    id: id,
                    value: obj,
                    subschemas: subschemas
                });
            });
        });
    }

    function findRefs(current = schema, paths = []) {
        var refs = [];
        let keys = Object.keys(current);

        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            let value = current[key];

            if (key === '$ref') {
                refs.push({
                    path: paths.join('/'),
                    value: value
                });
                continue;
            }

            if (Util.isObject(value)) {
                paths.push(key);
                Array.prototype.push.apply(refs, findRefs(value, paths));
                paths.pop();
            }
        }

        return refs;
    }

    function makeResolver(current, ref) {
        return new Promise((resolve, reject) => {
            resolveRef(ref.value).then((result) => {
                if (!result) {
                    resolve();
                    return;
                }

                if (result.inremote) {
                    var fragment = current;
                    let paths = ref.path.length && ref.path.split('/') || [];

                    for (let i = 0; i < paths.length; i++) {
                        fragment = fragment[paths[i]];
                    }

                    fragment.$ref = result.id;
                }

                resolve(result);
            }).catch(reject);
        });
    }

    function resolveObject(current = schema) {
        return new Promise((resolve, reject) => {
            let refs = findRefs(current);
            let work = [];

            if (refs.length === 0) {
                resolve({});
                return;
            }

            for (let i = 0; i < refs.length; i++) {
                work.push(makeResolver(current, refs[i]));
            }

            Promise.all(work).then((results) => {
                var schemas = {};

                for (let i = 0; i < results.length; i++) {
                    let result = results[i];

                    if (!result) {
                        continue;
                    }

                    schemas[result.id] = result.value;

                    let subkeys = Object.keys(result.subschemas);

                    for (let i = 0; i < subkeys.length; i++) {
                        let key = subkeys[i];
                        schemas[key] = result.subschemas[key];
                    }
                }

                resolve(schemas);
            }).catch(reject);
        });
    }

    return {
        resolve(callback) {
            resolveObject(schema).then((schemas) => {
                callback(null, schemas);
            }).catch(callback);
        }
    };
};
