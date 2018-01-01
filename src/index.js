import {
  isObject,
  omit,
  assign,
  isFunction,
  isString
} from 'lodash';

import Vent from '@krab/vent';

export default class Op {
  op = () => {}
  params = {}

  doc = null;
  types = {};

  vent = null;

  constructor(...args) {
    this.vent = new Vent();

    if (args.length === 0) {
      throw new Error('invalid constructor invocation');
    }

    const [op, params] = !isFunction(args[0]) ?
      [args[0].op, omit(args[0], 'op')] :
      [args[0], isObject(args[1]) ? args[1] : {}]
    ;

    const {doc, types} = {
      doc: isString(params.doc) ? params.doc : null,
      types: isObject(params.types) ? params.types : {}
    };

    if (!isFunction(op)) {
      throw new Error('op must be a function');
    }

    if (
      !isObject(types) ||
      !Object.keys(types).map((k) => types[k]).reduce((areValid, type) => {
        return areValid && isFunction(type);
      }, true)
    ) {
      throw new Error('all types should be functions');
    }

    assign(this, {op, doc, types});
  }

  clone() {
    const OpClass = this.constructor;
    const newOp = new OpClass({
      op: this.op,
      doc: this.doc,
      types: this.types
    });

    return newOp.mount(this.params);
  }

  opStr() {
    return (
      `
${this.op.toString()}
`
    );
  }

  mount(params={}) {
    this.params = {
      ...this.params,
      ...params
    };

    return this;
  }

  run(...args) {
    if (isObject(args[0])) {
      return this.mount(args[0]).run();
    }

    this.vent.emit('start', {op: this, params: this.params});

    const typeErrs = Object.keys(this.types)
      .map((key) => ({type: this.types[key], key, param: this.params[key]}))
      .reduce((errs, {type, key, param}) => {
        return {
          ...errs,
          ...(type(param) === true ? {} : {[key]: 'invalid'})
        };
      }, {})
    ;

    if (Object.keys(typeErrs).length > 0) {
      const err = new Error(JSON.stringify(typeErrs, null, 2));

      this.vent.emit('err', {op: this, err, params: this.params});
      this.vent.emit('end', {op: this, success: false, params: this.params});

      return Promise.reject(err);
    }

    const promise = this.op({...this.params, op: this.clone()});

    if (!(promise instanceof Promise)) {
      const err = new Error(
        this.opStr() + 'op must be async, or must return a promise'
      );

      this.vent.emit('err', {op: this, err, params: this.params});
      this.vent.emit('end', {op: this, success: false, params: this.params});

      return Promise.reject(err);
    }

    return new Promise((resolve, reject) => {
      promise.then((result) => {
        this.vent.emit('done', {op: this, result, params: this.params});
        this.vent.emit('end', {op: this, success: true, params: this.params});

        resolve(result);
      }).catch((err) => {
        this.vent.emit('err', {op: this, err, params: this.params});
        this.vent.emit('end', {op: this, success: false, params: this.params});

        reject(err);
      });
    });
  }
}
