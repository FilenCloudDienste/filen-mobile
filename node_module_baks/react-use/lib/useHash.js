"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useHash = void 0;
var tslib_1 = require("tslib");
var react_1 = require("react");
var useLifecycles_1 = tslib_1.__importDefault(require("./useLifecycles"));
/**
 * read and write url hash, response to url hash change
 */
exports.useHash = function () {
    var _a = react_1.useState(function () { return window.location.hash; }), hash = _a[0], setHash = _a[1];
    var onHashChange = react_1.useCallback(function () {
        setHash(window.location.hash);
    }, []);
    useLifecycles_1.default(function () {
        window.addEventListener('hashchange', onHashChange);
    }, function () {
        window.removeEventListener('hashchange', onHashChange);
    });
    var _setHash = react_1.useCallback(function (newHash) {
        if (newHash !== hash) {
            window.location.hash = newHash;
        }
    }, [hash]);
    return [hash, _setHash];
};
