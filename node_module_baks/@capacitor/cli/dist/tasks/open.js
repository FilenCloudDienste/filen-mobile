"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("../common");
const open_1 = require("../android/open");
const open_2 = require("../electron/open");
const open_3 = require("../ios/open");
async function openCommand(config, selectedPlatformName) {
    if (selectedPlatformName && !config.isValidPlatform(selectedPlatformName)) {
        const platformFolder = common_1.resolvePlatform(config, selectedPlatformName);
        if (platformFolder) {
            const result = await common_1.runPlatformHook(`cd "${platformFolder}" && ${await common_1.hasYarn(config) ? 'yarn' : 'npm'} run capacitor:open`);
            common_1.log(result);
        }
        else {
            common_1.logError(`platform ${selectedPlatformName} not found`);
        }
    }
    else {
        const platforms = config.selectPlatforms(selectedPlatformName);
        let platformName;
        if (platforms.length === 0) {
            common_1.logInfo(`There are no platforms to open yet. Create one with "capacitor add".`);
            return;
        }
        else if (platforms.length === 1) {
            platformName = platforms[0];
        }
        else {
            platformName = await config.askPlatform('', `Please choose a platform to open:`);
        }
        try {
            await open(config, platformName);
        }
        catch (e) {
            common_1.logFatal(e);
        }
    }
}
exports.openCommand = openCommand;
async function open(config, platformName) {
    if (platformName === config.ios.name) {
        await common_1.runTask('Opening the Xcode workspace...', () => {
            return open_3.openIOS(config);
        });
    }
    else if (platformName === config.android.name) {
        return open_1.openAndroid(config);
    }
    else if (platformName === config.web.name) {
        return Promise.resolve();
    }
    else if (platformName === config.electron.name) {
        common_1.electronWarning();
        return open_2.openElectron(config);
    }
    else {
        throw `Platform ${platformName} is not valid.`;
    }
}
exports.open = open;
