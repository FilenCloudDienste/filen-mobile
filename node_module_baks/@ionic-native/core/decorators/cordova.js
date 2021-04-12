import { wrap } from './common';
export function cordova(pluginObj, methodName, config, args) {
    return wrap(pluginObj, methodName, config).apply(this, args);
}
//# sourceMappingURL=cordova.js.map