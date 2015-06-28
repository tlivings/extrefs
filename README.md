# extrefs

Resolves references in json-schema to an object containing schemas keyed by reference.

### usage

```javascript
import Extrefs from 'extrefs';

Extrefs(schema).resolve((error, schemas) => {
    //plugin into validator
});
```

Example:

```json
//schema.json
{
    "type": "object",
    "properties": {
        "example": {
            "$ref": "example.json"
        }
    }
}

//example.json
{
    "type": "string"
}
```

Will result in an object containing:

```json
{
    "example.json": {
        "type": "string"
    }
}
```

Which can then be used in conjunction with a schema validator.

For remote references (i.e. urls), resulting schemas that contain local external references (i.e just a filename)
will be replaced with a fully qualified URL to the schema for proper resolution.

```json
//schema.json
{
    "type": "object",
    "properties": {
        "example": {
            "$ref": "http://example.org/example.json"
        }
    }
}

//http://example.org/example.json
{
    "type": "object",
    "properties": {
        "more": {
            "$ref": "more.json"
        }
    }
}

//http://example.org/example.json
{
    "example.json": {
        "type": "string"
    }
}
```

Will result in:

```json
{
    "http://example.org/example.json": {
        "type": "object",
        "properties": {
            "more": {
                "$ref": "http://example.org/more.json"
            }
        }
    },
    "http://example.org/more.json": {
        "type": "string"
    }
}
```

### extrefs(schema, options, callback) options

* `basedir` - base directory to search local file references for.
