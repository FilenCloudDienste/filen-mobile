"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const copy_1 = require("./copy");
const update_1 = require("./update");
const common_1 = require("../common");
const promise_1 = require("../util/promise");
/**
 * Sync is a copy and an update in one.
 */
async function syncCommand(config, selectedPlatformName, deployment) {
    if (selectedPlatformName && !config.isValidPlatform(selectedPlatformName)) {
        try {
            await copy_1.copyCommand(config, selectedPlatformName);
        }
        catch (e) {
            common_1.logError(e);
        }
        await update_1.updateCommand(config, selectedPlatformName, deployment);
    }
    else {
        const then = +new Date;
        const platforms = config.selectPlatforms(selectedPlatformName);
        if (platforms.length === 0) {
            common_1.logInfo(`There are no platforms to sync yet. Create one with "capacitor create".`);
            return;
        }
        try {
            await common_1.check(config, [common_1.checkPackage, common_1.checkWebDir, ...update_1.updateChecks(config, platforms)]);
            await promise_1.allSerial(platforms.map(platformName => () => sync(config, platformName, deployment)));
            const now = +new Date;
            const diff = (now - then) / 1000;
            common_1.log(`Sync finished in ${diff}s`);
        }
        catch (e) {
            common_1.logFatal(e);
        }
    }
}
exports.syncCommand = syncCommand;
async function sync(config, platformName, deployment) {
    try {
        await copy_1.copy(config, platformName);
    }
    catch (e) {
        common_1.logError(e);
    }
    await update_1.update(config, platformName, deployment);
}
exports.sync = sync;
