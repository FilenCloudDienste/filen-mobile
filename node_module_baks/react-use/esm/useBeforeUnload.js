import { useCallback, useEffect } from 'react';
var useBeforeUnload = function (enabled, message) {
    if (enabled === void 0) { enabled = true; }
    var handler = useCallback(function (event) {
        var finalEnabled = typeof enabled === 'function' ? enabled() : true;
        if (!finalEnabled) {
            return;
        }
        event.preventDefault();
        if (message) {
            event.returnValue = message;
        }
        return message;
    }, [enabled, message]);
    useEffect(function () {
        if (!enabled) {
            return;
        }
        window.addEventListener('beforeunload', handler);
        return function () { return window.removeEventListener('beforeunload', handler); };
    }, [enabled, handler]);
};
export default useBeforeUnload;
