import { useReducer } from 'react';
var updateReducer = function (num) { return (num + 1) % 1000000; };
var useUpdate = function () {
    var _a = useReducer(updateReducer, 0), update = _a[1];
    return update;
};
export default useUpdate;
