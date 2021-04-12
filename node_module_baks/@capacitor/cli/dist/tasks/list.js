"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("../common");
const promise_1 = require("../util/promise");
const plugin_1 = require("../plugin");
const common_2 = require("../android/common");
const common_3 = require("../ios/common");
async function listCommand(config, selectedPlatformName) {
    const platforms = config.selectPlatforms(selectedPlatformName);
    if (platforms.length === 0) {
        common_1.logInfo(`There are no platforms to list yet. Create one with \`capacitor create\`.`);
        return;
    }
    try {
        await promise_1.allSerial(platforms.map(platformName => () => list(config, platformName)));
    }
    catch (e) {
        common_1.logError(e);
    }
}
exports.listCommand = listCommand;
async function list(config, platform) {
    const allPlugins = await plugin_1.getPlugins(config);
    let plugins = [];
    if (platform === config.ios.name) {
        plugins = common_3.getIOSPlugins(allPlugins);
    }
    else if (platform === config.android.name) {
        plugins = common_2.getAndroidPlugins(allPlugins);
    }
    else if (platform === config.web.name || platform === config.electron.name) {
        common_1.logInfo(`Listing plugins for ${platform} is not possible`);
        return;
    }
    else {
        throw `Platform ${platform} is not valid.`;
    }
    const capacitorPlugins = plugins.filter(p => plugin_1.getPluginType(p, platform) === 0 /* Core */);
    plugin_1.printPlugins(capacitorPlugins, platform);
    const cordovaPlugins = plugins.filter(p => plugin_1.getPluginType(p, platform) === 1 /* Cordova */);
    plugin_1.printPlugins(cordovaPlugins, platform, 'cordova');
    const incompatibleCordovaPlugins = plugins.filter(p => plugin_1.getPluginType(p, platform) === 2 /* Incompatible */);
    plugin_1.printPlugins(incompatibleCordovaPlugins, platform, 'incompatible');
}
exports.list = list;
