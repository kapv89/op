### op

### v1.0.0

#### We follow [breaking].[feature].[fix] versioning

`npm install --save @krab/op`

This module provides a building-block for domain logic.
Any software can be writtent using `op` in such a way that
all of the domain logic in the software will be completely unit-testable.
Usage given below.

##### Usage
```js
import Op from '@krab/op'; // in projects with ES7 modules
const  Op = require('@krab/op/common'); // in projects with common JS modules

const domainOp = new Op(({db, api}) => {
  return db.getResults() // returns a promise
    .then((dbResults) => api.processData(dbResults))
  ;
});

// OR

const domainOp = new Op(async ({db, api}) => {
  const dbResults = await db.getResults();
  const apiResults = await api.processData(dbResults);

  return apiResults;
}, { // this param is optional
  doc: 'Does somthing with db and api',
  types: {
    db: (db) => db instanceof Db,
    api: (api) => api instanceof Api
  }
});

domainOp.mount({db: new Db(config.db), api: new Api(config.api)});
const results = await domainOp.run();
domainOp.run().then((results) => {});

// OR

domainOp.run({db: new Db(config.db), api: new Api(config.api)});
```

##### Features
1. An `op` is either async, or returns a Promise.
2. Failure to comply with `1.` will result in a runtime-error.
3. An `op` can have a `doc` string attached to it.
4. An `op` can have `types` associated with it, which will be used to validate the params supplied to the `op`.
5. An `op` can be run in 2 ways: `op.run(params)` or `op.mount(params).run()`.
6. `op.mount` mounts a set of `params` in the op, so that `op.run` can be called without any arguments.
7. An `op` can be cloned using `op.clone()`.
8. An `op.vent` is an event-aggregator on which the events `'start'`, `'err'`, `'done'`, and `'end'` are emitted att appropriate times in the lifecyclt of the `op`.

##### Op Events
`op` uses `@krab/vent`[link](https://github.com/kapv89/vent). Each instance of class `Op` has a property `vent`, which is an event aggregator attached to that instance.
Usage of `op.vent` given below.

```js
const op = new Op(...);

op.vent.on('start', ({op, params}) => {...});
op.vent.on('err', ({op, err, params}) => {...});
op.vent.on('done', ({op, result, params}) => {...});
op.vent.on('end', ({op, success, params}) => {...});


```
