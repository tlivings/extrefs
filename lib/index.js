'use strict';

import Util from 'util';
import Path from 'path';
import Url from 'url';
import Caller from 'caller';
import Fetch from './fetch';

export function Resolver(schema, {basedir}) {
    var urlcontext = basedir.substr(0, 5) === 'http:';

    function resolveRef(value) {
        var url = Url.parse(value);
        var id = url.pathname;

        //Local reference
        if (!id) {
            return Promise.resolve();
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

            return Fetch(destination).then((body) => {
                return Resolver(body, {basedir: baseurl}).then((subschemas) => {
                    return {
                        id: baseurl + '/' + id,
                        inremote: true,
                        value: body,
                        subschemas: subschemas
                    };
                });
            });
        }

        var obj;

        try {
            obj = require(Path.resolve(basedir, id));
        }
        catch (error) {
            return Promise.reject(error);
        }

        return Resolver(obj, {basedir: basedir}).then((subschemas) => {
            return {
                id: id,
                value: obj,
                subschemas: subschemas
            };
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
        return resolveRef(ref.value).then((result) => {
            if (!result) {
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

            return result;
        });
    }

    function resolveObject(current = schema) {
        let refs = findRefs(current);
        let work = [];

        if (refs.length === 0) {
            return Promise.resolve();
        }

        for (let i = 0; i < refs.length; i++) {
            work.push(makeResolver(current, refs[i]));
        }

        return Promise.all(work).then((results) => {
            var schemas = {};

            for (let i = 0; i < results.length; i++) {
                let result = results[i];

                if (!result) {
                    continue;
                }

                schemas[result.id] = result.value;

                if (result.subschemas) {
                    let subkeys = Object.keys(result.subschemas);

                    for (let i = 0; i < subkeys.length; i++) {
                        let key = subkeys[i];
                        schemas[key] = result.subschemas[key];
                    }
                }
            }

            return schemas;
        });
    }

    return resolveObject(schema);
}

export default function extrefs(schema = {}, {basedir = Path.dirname(Caller())} = {}) {
    let resolver = Resolver.apply(null, arguments);

    return {
        resolve(callback) {
            resolver.then((schemas) => {
                callback(null, schemas);
            }).catch(callback);
        }
    };
};
