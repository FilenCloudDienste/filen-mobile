function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* Forked from react-virtualized 💖 */
export var ALIGN_START = 'start';
export var ALIGN_CENTER = 'center';
export var ALIGN_END = 'end';

var SizeAndPositionManager = function () {
  function SizeAndPositionManager(_ref) {
    var itemCount = _ref.itemCount,
        itemSizeGetter = _ref.itemSizeGetter,
        estimatedItemSize = _ref.estimatedItemSize;

    _classCallCheck(this, SizeAndPositionManager);

    this._itemSizeGetter = itemSizeGetter;
    this._itemCount = itemCount;
    this._estimatedItemSize = estimatedItemSize;

    // Cache of size and position data for items, mapped by item index.
    this._itemSizeAndPositionData = {};

    // Measurements for items up to this index can be trusted; items afterward should be estimated.
    this._lastMeasuredIndex = -1;
  }

  SizeAndPositionManager.prototype.getLastMeasuredIndex = function getLastMeasuredIndex() {
    return this._lastMeasuredIndex;
  };

  /**
   * This method returns the size and position for the item at the specified index.
   * It just-in-time calculates (or used cached values) for items leading up to the index.
   */


  SizeAndPositionManager.prototype.getSizeAndPositionForIndex = function getSizeAndPositionForIndex(index) {
    if (index < 0 || index >= this._itemCount) {
      throw Error('Requested index ' + index + ' is outside of range 0..' + this._itemCount);
    }

    if (index > this._lastMeasuredIndex) {
      var lastMeasuredSizeAndPosition = this.getSizeAndPositionOfLastMeasuredItem();
      var offset = lastMeasuredSizeAndPosition.offset + lastMeasuredSizeAndPosition.size;

      for (var i = this._lastMeasuredIndex + 1; i <= index; i++) {
        var size = this._itemSizeGetter({ index: i });

        if (size == null || isNaN(size)) {
          throw Error('Invalid size returned for index ' + i + ' of value ' + size);
        }

        this._itemSizeAndPositionData[i] = {
          offset: offset,
          size: size
        };

        offset += size;
      }

      this._lastMeasuredIndex = index;
    }

    return this._itemSizeAndPositionData[index];
  };

  SizeAndPositionManager.prototype.getSizeAndPositionOfLastMeasuredItem = function getSizeAndPositionOfLastMeasuredItem() {
    return this._lastMeasuredIndex >= 0 ? this._itemSizeAndPositionData[this._lastMeasuredIndex] : { offset: 0, size: 0 };
  };

  /**
  * Total size of all items being measured.
  * This value will be completedly estimated initially.
  * As items as measured the estimate will be updated.
  */


  SizeAndPositionManager.prototype.getTotalSize = function getTotalSize() {
    var lastMeasuredSizeAndPosition = this.getSizeAndPositionOfLastMeasuredItem();

    return lastMeasuredSizeAndPosition.offset + lastMeasuredSizeAndPosition.size + (this._itemCount - this._lastMeasuredIndex - 1) * this._estimatedItemSize;
  };

  /**
   * Determines a new offset that ensures a certain item is visible, given the alignment.
   *
   * @param align Desired alignment within container; one of "start" (default), "center", or "end"
   * @param containerSize Size (width or height) of the container viewport
   * @return Offset to use to ensure the specified item is visible
   */


  SizeAndPositionManager.prototype.getUpdatedOffsetForIndex = function getUpdatedOffsetForIndex(_ref2) {
    var _ref2$align = _ref2.align,
        align = _ref2$align === undefined ? ALIGN_START : _ref2$align,
        containerSize = _ref2.containerSize,
        targetIndex = _ref2.targetIndex;

    if (containerSize <= 0) {
      return 0;
    }

    var datum = this.getSizeAndPositionForIndex(targetIndex);
    var maxOffset = datum.offset;
    var minOffset = maxOffset - containerSize + datum.size;

    var idealOffset = void 0;

    switch (align) {
      case ALIGN_END:
        idealOffset = minOffset;
        break;
      case ALIGN_CENTER:
        idealOffset = maxOffset - (containerSize - datum.size) / 2;
        break;
      default:
        idealOffset = maxOffset;
        break;
    }

    var totalSize = this.getTotalSize();

    return Math.max(0, Math.min(totalSize - containerSize, idealOffset));
  };

  SizeAndPositionManager.prototype.getVisibleRange = function getVisibleRange(_ref3) {
    var containerSize = _ref3.containerSize,
        offset = _ref3.offset,
        overscanCount = _ref3.overscanCount;

    var totalSize = this.getTotalSize();

    if (totalSize === 0) {
      return {};
    }

    var maxOffset = offset + containerSize;
    var start = this._findNearestItem(offset);
    var stop = start;

    var datum = this.getSizeAndPositionForIndex(start);
    offset = datum.offset + datum.size;

    while (offset < maxOffset && stop < this._itemCount - 1) {
      stop++;
      offset += this.getSizeAndPositionForIndex(stop).size;
    }

    if (overscanCount) {
      start = Math.max(0, start - overscanCount);
      stop = Math.min(stop + overscanCount, this._itemCount);
    }

    return {
      start: start,
      stop: stop
    };
  };

  /**
   * Clear all cached values for items after the specified index.
   * This method should be called for any item that has changed its size.
   * It will not immediately perform any calculations; they'll be performed the next time getSizeAndPositionForIndex() is called.
   */


  SizeAndPositionManager.prototype.resetItem = function resetItem(index) {
    this._lastMeasuredIndex = Math.min(this._lastMeasuredIndex, index - 1);
  };

  SizeAndPositionManager.prototype._binarySearch = function _binarySearch(_ref4) {
    var low = _ref4.low,
        high = _ref4.high,
        offset = _ref4.offset;

    var middle = void 0;
    var currentOffset = void 0;

    while (low <= high) {
      middle = low + Math.floor((high - low) / 2);
      currentOffset = this.getSizeAndPositionForIndex(middle).offset;

      if (currentOffset === offset) {
        return middle;
      } else if (currentOffset < offset) {
        low = middle + 1;
      } else if (currentOffset > offset) {
        high = middle - 1;
      }
    }

    if (low > 0) {
      return low - 1;
    }
  };

  SizeAndPositionManager.prototype._exponentialSearch = function _exponentialSearch(_ref5) {
    var index = _ref5.index,
        offset = _ref5.offset;

    var interval = 1;

    while (index < this._itemCount && this.getSizeAndPositionForIndex(index).offset < offset) {
      index += interval;
      interval *= 2;
    }

    return this._binarySearch({
      high: Math.min(index, this._itemCount - 1),
      low: Math.floor(index / 2),
      offset: offset
    });
  };

  /**
   * Searches for the item (index) nearest the specified offset.
   *
   * If no exact match is found the next lowest item index will be returned.
   * This allows partially visible items (with offsets just before/above the fold) to be visible.
   */


  SizeAndPositionManager.prototype._findNearestItem = function _findNearestItem(offset) {
    if (isNaN(offset)) {
      throw Error('Invalid offset ' + offset + ' specified');
    }

    // Our search algorithms find the nearest match at or below the specified offset.
    // So make sure the offset is at least 0 or no match will be found.
    offset = Math.max(0, offset);

    var lastMeasuredSizeAndPosition = this.getSizeAndPositionOfLastMeasuredItem();
    var lastMeasuredIndex = Math.max(0, this._lastMeasuredIndex);

    if (lastMeasuredSizeAndPosition.offset >= offset) {
      // If we've already measured items within this range just use a binary search as it's faster.
      return this._binarySearch({
        high: lastMeasuredIndex,
        low: 0,
        offset: offset
      });
    } else {
      // If we haven't yet measured this high, fallback to an exponential search with an inner binary search.
      // The exponential search avoids pre-computing sizes for the full set of items as a binary search would.
      // The overall complexity for this approach is O(log n).
      return this._exponentialSearch({
        index: lastMeasuredIndex,
        offset: offset
      });
    }
  };

  return SizeAndPositionManager;
}();

export { SizeAndPositionManager as default };