'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _class, _temp2;

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var LongPress = (_temp2 = _class = function (_Component) {
  _inherits(LongPress, _Component);

  function LongPress() {
    var _temp, _this, _ret;

    _classCallCheck(this, LongPress);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, _Component.call.apply(_Component, [this].concat(args))), _this), _this.shouldShortPress = true, _this.moved = false, _this.state = {
      touch: true
    }, _this.startTimeout = function () {
      _this.timeout = setTimeout(_this.longPressed, _this.props.time);
    }, _this.longPressed = function () {
      _this.shouldShortPress = false;
      if (_this.props.onLongPress && _this.moved === false) {
        _this.props.onLongPress();
      }
    }, _this.cancelTimeout = function () {
      clearTimeout(_this.timeout);
    }, _this.onTouchStart = function (e) {
      _this.shouldShortPress = true;
      _this.moved = false;
      _this.startTimeout();
      if (typeof _this.props.onTouchStart === 'function') {
        _this.props.onTouchStart(e);
      }
    }, _this.onTouchEnd = function (e) {
      _this.cancelTimeout();
      if (_this.props.onPress && _this.shouldShortPress && _this.moved === false) {
        _this.props.onPress();
      }
      if (typeof _this.props.onTouchEnd === 'function') {
        _this.props.onTouchEnd(e);
      }
    }, _this.onTouchCancel = function (e) {
      _this.cancelTimeout();
      if (typeof _this.props.onTouchCancel === 'function') {
        _this.props.onTouchCancel(e);
      }
    }, _this.onMove = function (e) {
      _this.moved = true;
      if (typeof _this.props.onTouchMove === 'function') {
        _this.props.onTouchMove(e);
      }
    }, _temp), _possibleConstructorReturn(_this, _ret);
  }

  LongPress.prototype.componentDidMount = function componentDidMount() {
    try {
      document.createEvent('TouchEvent');
    } catch (e) {
      // touch is not available, disable handlers
      this.setState({ touch: false });
    }
  };

  LongPress.prototype.componentWillUnmount = function componentWillUnmount() {
    this.cancelTimeout();
  };

  LongPress.prototype.render = function render() {
    var _props = this.props,
        children = _props.children,
        disabled = _props.disabled;
    var touch = this.state.touch;


    if (!touch || disabled) {
      return children;
    }

    var props = {
      onContextMenu: function onContextMenu(e) {
        return e.preventDefault();
      },
      onTouchStart: this.onTouchStart,
      onTouchEnd: this.onTouchEnd,
      onTouchMove: this.onMove,
      onTouchCancel: this.onTouchCancel,
      style: _extends({}, children.props.style, {
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none'
      })
    };

    return _react2.default.cloneElement(children, _extends({}, children.props, props));
  };

  return LongPress;
}(_react.Component), _class.defaultProps = {
  time: 500
}, _temp2);
exports.default = LongPress;
module.exports = exports['default'];