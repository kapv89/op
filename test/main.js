import assert from 'assert';
import {isFinite, isString} from 'lodash';

import Op from '../src';

// something to show stack traces of async exceptions
function handleAsyncExceptions() {
  if (handleAsyncExceptions.hooked === false) {
    process.on('unhandledRejection', (err) => {
      throw err;
    });

    handleAsyncExceptions.hooked = true;
  }
}

handleAsyncExceptions.hooked = false;

async function run() {
  await testIfOpWorks();
  await testOpLifeCycle();
  await testOpTypesDocAndRecursion();
}

async function testIfOpWorks() {
  const testPromiseOp = new Op(({x, y}) => {
    return Promise.resolve(x + y);
  });

  const resultPromiseOp = await testPromiseOp.run({x: 2, y: 3});
  assert.ok(resultPromiseOp === 5);

  const testAsyncOp = new Op(async ({x, y}) => {
    return x * y;
  });

  const resultAsyncOp = await testAsyncOp.run({x: 3, y: 4});
  assert.ok(resultAsyncOp === 12);

  const noAsyncOp = new Op(({x, y}) => (x/y));

  try {
    await noAsyncOp.run({x: 3, y: 4});
  } catch (err) {
    assert.ok(err instanceof Error);
  }
}

async function testOpLifeCycle() {
  const mockErr = new Error('invalid');

  const mockOp = new Op(async ({x, y}) => {
    if (x === 2) {
      throw mockErr;
    }

    return x * y;
  });

  const onStart = newTrackedFn(({op}) => assert.ok(mockOp === op));
  const onDone = newTrackedFn(({op}) => assert.ok(mockOp === op));
  const onEnd = newTrackedFn(({op}) => assert.ok(mockOp === op));
  const onErr = newTrackedFn(({op, err}) => {
    assert.ok(mockOp === op);
    assert.ok(mockErr === err);
  });

  mockOp.vent.on('start', onStart);
  mockOp.vent.on('done', onDone);
  mockOp.vent.on('end', onEnd);
  mockOp.vent.on('err', onErr);

  const mockRes = await mockOp.run({x: 3, y: 4});
  assert.ok(mockRes === 12);
  assert.ok(onStart.runs.length === 1);
  assert.ok(onDone.runs.length === 1);
  assert.ok(onEnd.runs.length === 1);

  try {
    await mockOp.run({x: 2, y: 5});
  } catch (err) {
    assert.ok(err === mockErr);
    assert.ok(onErr.runs.length === 1);
    assert.ok(onStart.runs.length === 2);
    assert.ok(onDone.runs.length === 1);
    assert.ok(onEnd.runs.length === 2);
  }
}

async function testOpTypesDocAndRecursion() {
  const mockOp = new Op(({n, op}) => {
    if (n === 1) {
      return Promise.resolve(1);
    } else {
      return op.run({n: n-1}).then((res) => res * n);
    }
  }, {
    doc: 'Calculates factorial: op.run({n: 5})',
    types: {
      n: (n) => isFinite(n) && n > 0
    }
  });

  assert.ok(isString(mockOp.doc));

  try {
    await mockOp.run(-1);
  } catch (err) {
    assert.ok(err instanceof Error);
  }

  const res = await mockOp.run({n: 5});
  assert.ok(res === (5*4*3*2*1));
}

function newTrackedFn(fn=(() => {})) {
  const trackedFn = (...args) => {
    trackedFn.runs.push(args);
    return fn(...args);
  };

  trackedFn.runs = [];

  return trackedFn;
}

if (require.main === module) {
  handleAsyncExceptions();
  run();
}
