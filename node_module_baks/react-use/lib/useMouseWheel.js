"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
exports.default = (function () {
    var _a = react_1.useState(0), mouseWheelScrolled = _a[0], setMouseWheelScrolled = _a[1];
    react_1.useEffect(function () {
        var updateScroll = function (e) {
            setMouseWheelScrolled(e.deltaY + mouseWheelScrolled);
        };
        window.addEventListener('wheel', updateScroll, false);
        return function () { return window.removeEventListener('wheel', updateScroll); };
    });
    return mouseWheelScrolled;
});
