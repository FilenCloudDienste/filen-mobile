import { checkAvailability, getPlugin } from './common';
export function cordovaPropertyGet(pluginObj, key) {
    if (checkAvailability(pluginObj, key) === true) {
        return getPlugin(pluginObj.constructor.getPluginRef())[key];
    }
    return null;
}
export function cordovaPropertySet(pluginObj, key, value) {
    if (checkAvailability(pluginObj, key) === true) {
        getPlugin(pluginObj.constructor.getPluginRef())[key] = value;
    }
}
//# sourceMappingURL=cordova-property.js.map