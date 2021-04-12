# virtualized-list
> A tiny vanilla virtualization library, with DOM diffing

[![npm package][npm-badge]][npm]
[![Build Status](https://travis-ci.org/clauderic/virtualized-list.svg?branch=master)](https://travis-ci.org/clauderic/virtualized-list)
[![codecov](https://codecov.io/gh/clauderic/virtualized-list/branch/master/graph/badge.svg)](https://codecov.io/gh/clauderic/virtualized-list)

Installation
------------

Using [npm](https://www.npmjs.com/package/virtualized-list):

	npm install virtualized-list --save

Usage
------------
### Basic example
```js
const rows = ['a', 'b', 'c', 'd'];

const virtualizedList = new VirtualizedList(container, {
  height: 500, // The height of the container
  rowCount: rows.length,
  renderRow: index => {
  	const element = document.createElement('div');
  	element.innerHTML = rows[index];

  	return element;
  },
  rowHeight: 150,
)};
```

### Advanced example
```js
const rows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const rowHeights = [150, 120, 100, 80, 50, 35, 200, 500, 50, 300];

const virtualizedList = new VirtualizedList(container, {
  height: 400,
  rowCount: rows.length,
  renderRow: (row, index) => {
  	const element = document.createElement('div');
  	element.innerHTML = row;

  	return element;
  },
  rowHeight: index => rowHeights[index],
  estimatedRowHeight: 155,
  overscanCount: 5, // Number of rows to render above/below the visible rows.
  initialScrollIndex: 8,
  onMount: () => {
    // Programatically scroll to item index #3 after 2 seconds
    setTimeout(() =>
      virtualizedList.scrollToIndex(3)
    , 2000);
  }
)}
```


### Options
| Property           | Type                      | Required? | Description                                                                                                                                                                       |
|:-------------------|:--------------------------|:----------|:----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| height             | Number                    | ✓         | Height of List. This property will determine the number of rendered vs virtualized items                                                                                          |
| rowCount           | Number                    | ✓         | The number of rows you want to render                                                                                                                                             |
| renderRow          | Function                  | ✓         | Responsible for rendering an item given it's index: `({index: number, style: Object}): React.PropTypes.node`. The returned element must handle key and style.                     |
| rowHeight          | Number, Array or Function | ✓         | Either a fixed height, an array containing the heights of all the items in your list, or a function that returns the height of an item given its index: `(index: number): number` |
| initialScrollTop   | Number                    |           | The initial scrollTop value (optional)                                                                                                                                            |
| initialIndex       | Number                    |           | Initial item index to scroll to (by forcefully scrolling if necessary)                                                                                                            |
| overscanCount      | Number                    |           | Number of extra buffer items to render above/below the visible items. Tweaking this can help reduce scroll flickering on certain browsers/devices. Defaults to `3`                |
| estimatedRowHeight | Number                    |           | Used to estimate the total size of the list before all of its items have actually been measured. The estimated total height is progressively adjusted as items are rendered.      |
| onMount            | Function                  |           | Callback invoked once the virtual list has mounted.                                                                                                                               |
| onScroll           | Function                  |           | Callback invoked onScroll. `function (scrollTop, event)`                                                                                                                          |
| onRowsRendered     | Function                  |           | Callback invoked with information about the range of rows just rendered                                                                                                           |

[npm-badge]: https://img.shields.io/npm/v/virtualized-list.svg
[npm]: https://www.npmjs.org/package/virtualized-list
