function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

import morphdom from 'morphdom';
import SizeAndPositionManager from './SizeAndPositionManager';

var STYLE_INNER = 'position:relative; overflow:hidden; width:100%; min-height:100%; will-change: transform;';
var STYLE_CONTENT = 'position:absolute; top:0; left:0; height:100%; width:100%; overflow:visible;';

var VirtualizedList = function () {
  function VirtualizedList(container, options) {
    var _this = this;

    _classCallCheck(this, VirtualizedList);

    this.getRowHeight = function (_ref) {
      var index = _ref.index;
      var rowHeight = _this.options.rowHeight;


      if (typeof rowHeight === 'function') {
        return rowHeight(index);
      }

      return Array.isArray(rowHeight) ? rowHeight[index] : rowHeight;
    };

    this.container = container;
    this.options = options;

    // Initialization
    this.state = {};
    this._initializeSizeAndPositionManager(options.rowCount);

    // Binding
    this.render = this.render.bind(this);
    this.handleScroll = this.handleScroll.bind(this);

    // Lifecycle Methods
    this.componentDidMount();
  }

  VirtualizedList.prototype.componentDidMount = function componentDidMount() {
    var _this2 = this;

    var _options = this.options,
        onMount = _options.onMount,
        initialScrollTop = _options.initialScrollTop,
        initialIndex = _options.initialIndex,
        height = _options.height;

    var offset = initialScrollTop || initialIndex != null && this.getRowOffset(initialIndex) || 0;
    var inner = this.inner = document.createElement('div');
    var content = this.content = document.createElement('div');

    inner.setAttribute('style', STYLE_INNER);
    content.setAttribute('style', STYLE_CONTENT);
    inner.appendChild(content);
    this.container.appendChild(inner);

    this.setState({
      offset: offset,
      height: height
    }, function () {
      if (offset) {
        _this2.container.scrollTop = offset;
      }

      // Add event listeners
      _this2.container.addEventListener('scroll', _this2.handleScroll);

      if (typeof onMount === 'function') {
        onMount();
      }
    });
  };

  VirtualizedList.prototype._initializeSizeAndPositionManager = function _initializeSizeAndPositionManager(count) {
    this._sizeAndPositionManager = new SizeAndPositionManager({
      itemCount: count,
      itemSizeGetter: this.getRowHeight,
      estimatedItemSize: this.options.estimatedRowHeight || 100
    });
  };

  VirtualizedList.prototype.setState = function setState() {
    var _this3 = this;

    var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var callback = arguments[1];

    this.state = Object.assign(this.state, state);

    requestAnimationFrame(function () {
      _this3.render();

      if (typeof callback === 'function') {
        callback();
      }
    });
  };

  VirtualizedList.prototype.resize = function resize(height, callback) {
    this.setState({
      height: height
    }, callback);
  };

  VirtualizedList.prototype.handleScroll = function handleScroll(e) {
    var onScroll = this.options.onScroll;

    var offset = this.container.scrollTop;

    this.setState({ offset: offset });

    if (typeof onScroll === 'function') {
      onScroll(offset, e);
    }
  };

  VirtualizedList.prototype.getRowOffset = function getRowOffset(index) {
    var _sizeAndPositionManag = this._sizeAndPositionManager.getSizeAndPositionForIndex(index),
        offset = _sizeAndPositionManag.offset;

    return offset;
  };

  VirtualizedList.prototype.scrollToIndex = function scrollToIndex(index, alignment) {
    var height = this.state.height;

    var offset = this._sizeAndPositionManager.getUpdatedOffsetForIndex({
      align: alignment,
      containerSize: height,
      targetIndex: index
    });

    this.container.scrollTop = offset;
  };

  VirtualizedList.prototype.setRowCount = function setRowCount(count) {
    this._initializeSizeAndPositionManager(count);
    this.render();
  };

  VirtualizedList.prototype.onRowsRendered = function onRowsRendered(renderedRows) {
    var onRowsRendered = this.options.onRowsRendered;


    if (typeof onRowsRendered === 'function') {
      onRowsRendered(renderedRows);
    }
  };

  VirtualizedList.prototype.destroy = function destroy() {
    this.container.removeEventListener('scroll', this.handleScroll);
    this.container.innerHTML = '';
  };

  VirtualizedList.prototype.render = function render() {
    var _options2 = this.options,
        overscanCount = _options2.overscanCount,
        renderRow = _options2.renderRow;
    var _state = this.state,
        height = _state.height,
        _state$offset = _state.offset,
        offset = _state$offset === undefined ? 0 : _state$offset;

    var _sizeAndPositionManag2 = this._sizeAndPositionManager.getVisibleRange({
      containerSize: height,
      offset: offset,
      overscanCount: overscanCount
    }),
        start = _sizeAndPositionManag2.start,
        stop = _sizeAndPositionManag2.stop;

    var fragment = document.createDocumentFragment();

    for (var index = start; index <= stop; index++) {
      fragment.appendChild(renderRow(index));
    }

    this.inner.style.height = this._sizeAndPositionManager.getTotalSize() + 'px';
    this.content.style.top = this.getRowOffset(start) + 'px';

    morphdom(this.content, fragment, {
      childrenOnly: true,
      getNodeKey: function getNodeKey(node) {
        return node.nodeIndex;
      }
    });

    this.onRowsRendered({
      startIndex: start,
      stopIndex: stop
    });
  };

  return VirtualizedList;
}();

export { VirtualizedList as default };