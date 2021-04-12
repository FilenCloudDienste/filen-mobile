import { wrapInstance } from './common';
export function cordovaInstance(pluginObj, methodName, config, args) {
    args = Array.from(args);
    return wrapInstance(pluginObj, methodName, config).apply(this, args);
}
//# sourceMappingURL=cordova-instance.js.map