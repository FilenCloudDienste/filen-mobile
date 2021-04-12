"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var useUnmountPromise = function () {
    var refUnmounted = react_1.useRef(false);
    react_1.useEffect(function () { return function () {
        refUnmounted.current = true;
    }; });
    var wrapper = react_1.useMemo(function () {
        var race = function (promise, onError) {
            var newPromise = new Promise(function (resolve, reject) {
                promise.then(function (result) {
                    if (!refUnmounted.current)
                        resolve(result);
                }, function (error) {
                    if (!refUnmounted.current)
                        reject(error);
                    else if (onError)
                        onError(error);
                    else
                        console.error('useUnmountPromise', error);
                });
            });
            return newPromise;
        };
        return race;
    }, []);
    return wrapper;
};
exports.default = useUnmountPromise;
