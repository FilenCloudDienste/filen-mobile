import { useRef, useEffect } from 'react';
var DEFAULT_USE_TITLE_OPTIONS = {
    restoreOnUnmount: false,
};
function useTitle(title, options) {
    if (options === void 0) { options = DEFAULT_USE_TITLE_OPTIONS; }
    var prevTitleRef = useRef(document.title);
    document.title = title;
    useEffect(function () {
        if (options && options.restoreOnUnmount) {
            return function () {
                document.title = prevTitleRef.current;
            };
        }
        else {
            return;
        }
    }, []);
}
export default typeof document !== 'undefined' ? useTitle : function (_title) { };
