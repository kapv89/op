'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _vent = require('@krab/vent');

var _vent2 = _interopRequireDefault(_vent);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Op = function () {
  function Op() {
    _classCallCheck(this, Op);

    this.op = function () {};

    this.params = {};
    this.doc = null;
    this.types = {};
    this.vent = null;

    this.vent = new _vent2.default();

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    if (args.length === 0) {
      throw new Error('invalid constructor invocation');
    }

    var _ref = !(0, _lodash.isFunction)(args[0]) ? [args[0].op, (0, _lodash.omit)(args[0], 'op')] : [args[0], (0, _lodash.isObject)(args[1]) ? args[1] : {}],
        _ref2 = _slicedToArray(_ref, 2),
        op = _ref2[0],
        params = _ref2[1];

    var _doc$types = {
      doc: (0, _lodash.isString)(params.doc) ? params.doc : null,
      types: (0, _lodash.isObject)(params.types) ? params.types : {}
    },
        doc = _doc$types.doc,
        types = _doc$types.types;


    if (!(0, _lodash.isFunction)(op)) {
      throw new Error('op must be a function');
    }

    if (!(0, _lodash.isObject)(types) || !Object.keys(types).map(function (k) {
      return types[k];
    }).reduce(function (areValid, type) {
      return areValid && (0, _lodash.isFunction)(type);
    }, true)) {
      throw new Error('all types should be functions');
    }

    (0, _lodash.assign)(this, { op: op, doc: doc, types: types });
  }

  _createClass(Op, [{
    key: 'clone',
    value: function clone() {
      var OpClass = this.constructor;
      var newOp = new OpClass({
        op: this.op,
        doc: this.doc,
        types: this.types
      });

      return newOp.mount(this.params);
    }
  }, {
    key: 'opStr',
    value: function opStr() {
      return '\n' + this.op.toString() + '\n';
    }
  }, {
    key: 'mount',
    value: function mount() {
      var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      this.params = _extends({}, this.params, params);

      return this;
    }
  }, {
    key: 'run',
    value: function run() {
      var _this = this;

      if ((0, _lodash.isObject)(arguments.length <= 0 ? undefined : arguments[0])) {
        return this.mount(arguments.length <= 0 ? undefined : arguments[0]).run();
      }

      this.vent.emit('start', { op: this });

      var typeErrs = Object.keys(this.types).map(function (key) {
        return { type: _this.types[key], key: key, param: _this.params[key] };
      }).reduce(function (errs, _ref3) {
        var type = _ref3.type,
            key = _ref3.key,
            param = _ref3.param;

        return _extends({}, errs, type(param) === true ? {} : _defineProperty({}, key, 'invalid'));
      }, {});

      if (Object.keys(typeErrs).length > 0) {
        var err = new Error(JSON.stringify(typeErrs, null, 2));

        this.vent.emit('err', { op: this, err: err });
        this.vent.emit('end', { op: this, success: false });

        return Promise.reject(err);
      }

      var promise = this.op(_extends({}, this.params, { op: this.clone() }));

      if (!(promise instanceof Promise)) {
        var _err = new Error(this.opStr() + 'op must be async, or must return a promise');

        this.vent.emit('err', { op: this, err: _err });
        this.vent.emit('end', { op: this, success: false });

        return Promise.reject(_err);
      }

      return new Promise(function (resolve, reject) {
        promise.then(function (result) {
          _this.vent.emit('done', { op: _this, result: result });
          _this.vent.emit('end', { op: _this, success: true });

          resolve(result);
        }).catch(function (err) {
          _this.vent.emit('err', { op: _this, err: err });
          _this.vent.emit('end', { op: _this, success: false });

          reject(err);
        });
      });
    }
  }]);

  return Op;
}();

exports.default = Op;