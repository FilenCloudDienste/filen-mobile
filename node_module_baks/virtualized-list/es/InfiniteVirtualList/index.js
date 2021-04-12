function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

import VirtualList from '../VirtualList';

var InfiniteVirtualList = function (_VirtualList) {
  _inherits(InfiniteVirtualList, _VirtualList);

  function InfiniteVirtualList() {
    _classCallCheck(this, InfiniteVirtualList);

    return _possibleConstructorReturn(this, _VirtualList.apply(this, arguments));
  }

  InfiniteVirtualList.prototype.onRowsRendered = function onRowsRendered(_ref) {
    var _this2 = this;

    var startIndex = _ref.startIndex,
        stopIndex = _ref.stopIndex;
    var _options = this.options,
        isRowLoaded = _options.isRowLoaded,
        loadMoreRows = _options.loadMoreRows,
        _options$minimumBatch = _options.minimumBatchSize,
        minimumBatchSize = _options$minimumBatch === undefined ? 10 : _options$minimumBatch,
        _options$rowCount = _options.rowCount,
        rowCount = _options$rowCount === undefined ? 0 : _options$rowCount,
        _options$threshold = _options.threshold,
        threshold = _options$threshold === undefined ? 15 : _options$threshold;


    var unloadedRanges = getUnloadedRanges({
      isRowLoaded: isRowLoaded,
      minimumBatchSize: minimumBatchSize,
      rowCount: rowCount,
      startIndex: Math.max(0, startIndex - threshold),
      stopIndex: Math.min(rowCount - 1, stopIndex + threshold)
    });

    unloadedRanges.forEach(function (unloadedRange) {
      var promise = loadMoreRows(unloadedRange);

      if (promise) {
        promise.then(function () {
          // Refresh the visible rows if any of them have just been loaded.
          // Otherwise they will remain in their unloaded visual state.
          if (isRangeVisible({
            lastRenderedStartIndex: startIndex,
            lastRenderedStopIndex: stopIndex,
            startIndex: unloadedRange.startIndex,
            stopIndex: unloadedRange.stopIndex
          })) {
            // Force update
            _this2.render();
          }
        });
      }
    });
  };

  return InfiniteVirtualList;
}(VirtualList);

/**
 * Determines if the specified start/stop range is visible based on the most recently rendered range.
 */


export { InfiniteVirtualList as default };
export function isRangeVisible(_ref2) {
  var lastRenderedStartIndex = _ref2.lastRenderedStartIndex,
      lastRenderedStopIndex = _ref2.lastRenderedStopIndex,
      startIndex = _ref2.startIndex,
      stopIndex = _ref2.stopIndex;

  return !(startIndex > lastRenderedStopIndex || stopIndex < lastRenderedStartIndex);
}

/**
 * Returns all of the ranges within a larger range that contain unloaded rows.
 */
export function getUnloadedRanges(_ref3) {
  var isRowLoaded = _ref3.isRowLoaded,
      minimumBatchSize = _ref3.minimumBatchSize,
      rowCount = _ref3.rowCount,
      startIndex = _ref3.startIndex,
      stopIndex = _ref3.stopIndex;

  var unloadedRanges = [];
  var rangeStartIndex = null;
  var rangeStopIndex = null;

  for (var index = startIndex; index <= stopIndex; index++) {
    var loaded = isRowLoaded(index);

    if (!loaded) {
      rangeStopIndex = index;
      if (rangeStartIndex === null) {
        rangeStartIndex = index;
      }
    } else if (rangeStopIndex !== null) {
      unloadedRanges.push({
        startIndex: rangeStartIndex,
        stopIndex: rangeStopIndex
      });

      rangeStartIndex = rangeStopIndex = null;
    }
  }

  // If :rangeStopIndex is not null it means we haven't ran out of unloaded rows.
  // Scan forward to try filling our :minimumBatchSize.
  if (rangeStopIndex !== null) {
    var potentialStopIndex = Math.min(Math.max(rangeStopIndex, rangeStartIndex + minimumBatchSize - 1), rowCount - 1);

    for (var _index = rangeStopIndex + 1; _index <= potentialStopIndex; _index++) {
      if (!isRowLoaded({ index: _index })) {
        rangeStopIndex = _index;
      } else {
        break;
      }
    }

    unloadedRanges.push({
      startIndex: rangeStartIndex,
      stopIndex: rangeStopIndex
    });
  }

  // Check to see if our first range ended prematurely.
  // In this case we should scan backwards to try filling our :minimumBatchSize.
  if (unloadedRanges.length) {
    var firstUnloadedRange = unloadedRanges[0];

    while (firstUnloadedRange.stopIndex - firstUnloadedRange.startIndex + 1 < minimumBatchSize && firstUnloadedRange.startIndex > 0) {
      var _index2 = firstUnloadedRange.startIndex - 1;

      if (!isRowLoaded({ index: _index2 })) {
        firstUnloadedRange.startIndex = _index2;
      } else {
        break;
      }
    }
  }

  return unloadedRanges;
}