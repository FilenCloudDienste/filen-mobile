import { Observable } from 'rxjs';
import { checkAvailability, getPlugin } from './common';
function overrideFunction(pluginObj, methodName) {
    return new Observable(function (observer) {
        var availabilityCheck = checkAvailability(pluginObj, methodName);
        if (availabilityCheck === true) {
            var pluginInstance_1 = getPlugin(pluginObj.constructor.getPluginRef());
            pluginInstance_1[methodName] = observer.next.bind(observer);
            return function () { return (pluginInstance_1[methodName] = function () { }); };
        }
        else {
            observer.error(availabilityCheck);
            observer.complete();
        }
    });
}
export function cordovaFunctionOverride(pluginObj, methodName, args) {
    if (args === void 0) { args = []; }
    return overrideFunction(pluginObj, methodName);
}
//# sourceMappingURL=cordova-function-override.js.map