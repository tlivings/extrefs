'use strict';

import Test from 'tape';
import Extrefs from '../dist/lib';
import Path from 'path';
import Http from 'http';

Test('test', function (t) {

    t.test('plan', function (t) {
        t.plan(3);

        let server = Http.createServer((request, response) => {
            response.writeHead(200, {
                'content-type': 'application/json'
            })
            if (request.url === '/sub2a.json') {
                response.write(JSON.stringify({
                    type: 'object',
                    properties: {
                        sub3: {
                            "$ref": "sub3.json"
                        }
                    }
                }));
            }
            if (request.url === '/sub3.json') {
                response.write(JSON.stringify({
                    type: 'string'
                }));
            }
            response.end();
        });

        server.listen(3000, () => {
            let schema = require(Path.resolve('test/fixtures/schema'));

            Extrefs(schema, { basedir: Path.resolve(__dirname, 'fixtures') }).resolve((error, schemas) => {
                error && console.log(error.stack);
                t.ok(!error, 'no error');
                t.equal(Object.keys(schemas).length, 5, 'has five subschemas.');
                t.equal(schemas['http://127.0.0.1:3000/sub2a.json'].properties.sub3.$ref, 'http://127.0.0.1:3000/sub3.json', 'replaced remote-local $ref with fully qualified.');
            });
        }).unref();
    });

});
