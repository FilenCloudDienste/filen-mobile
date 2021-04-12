import { useState, useCallback } from 'react';
import useLifecycles from './useLifecycles';
/**
 * read and write url hash, response to url hash change
 */
export var useHash = function () {
    var _a = useState(function () { return window.location.hash; }), hash = _a[0], setHash = _a[1];
    var onHashChange = useCallback(function () {
        setHash(window.location.hash);
    }, []);
    useLifecycles(function () {
        window.addEventListener('hashchange', onHashChange);
    }, function () {
        window.removeEventListener('hashchange', onHashChange);
    });
    var _setHash = useCallback(function (newHash) {
        if (newHash !== hash) {
            window.location.hash = newHash;
        }
    }, [hash]);
    return [hash, _setHash];
};
